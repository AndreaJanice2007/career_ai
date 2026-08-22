"""Store for accounts, sessions, avatars and saved career paths.

Two interchangeable backends with identical behaviour. JSON files under
`backend/data` are used for local development, exactly as before. When Upstash
Redis credentials are present in the environment the same data lives in Redis
instead, which is what the serverless deployment needs because its filesystem is
read-only. Every public function below behaves the same either way; only where
the bytes land changes. Passwords are never stored in the clear.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
USERS_PATH = DATA_DIR / "users.json"
SESSIONS_PATH = DATA_DIR / "sessions.json"
PATHS_PATH = DATA_DIR / "saved_paths.json"
# Kept out of users.json so the account file stays small and readable.
AVATARS_PATH = DATA_DIR / "avatars.json"

# Vercel's Upstash integration injects the KV_* pair; the UPSTASH_* pair is what
# Upstash itself calls them, so both are accepted.
REDIS_URL = (os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or "").rstrip("/")
REDIS_TOKEN = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""
REDIS_PREFIX = os.getenv("CAREERNOVA_REDIS_PREFIX", "careernova")

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,32}$")
AVATAR_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
# A 256px square thumbnail lands well under this; the cap stops the store from
# being used as a file dump.
MAX_AVATAR_CHARS = 600_000
MIN_PASSWORD = 6
PBKDF2_ROUNDS = 200_000

_lock = Lock()


class AuthError(Exception):
    """Raised for any credential problem the caller should surface as 401/409."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


class StoreError(Exception):
    """Raised when the backing store itself is unreachable."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _read(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        # A corrupt store should not take the API down; the next write rebuilds it.
        return fallback
    return data if isinstance(data, type(fallback)) else fallback


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Write to a temporary file first so an interrupted save cannot truncate
    # the existing store.
    handle = tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=path.parent,
        prefix=path.stem,
        suffix=".tmp",
        delete=False,
    )
    try:
        with handle:
            json.dump(payload, handle, indent=2, ensure_ascii=False)
        os.replace(handle.name, path)
    except BaseException:
        Path(handle.name).unlink(missing_ok=True)
        raise


class _JsonStore:
    """The original file-backed store, unchanged in shape and on-disk format."""

    name = "json"

    def get_user(self, key: str) -> dict | None:
        with _lock:
            return _read(USERS_PATH, {}).get(key)

    def all_users(self) -> dict:
        with _lock:
            return _read(USERS_PATH, {})

    def claim_user(self, key: str, record: dict) -> bool:
        with _lock:
            users = _read(USERS_PATH, {})
            if key in users:
                return False
            users[key] = record
            _write(USERS_PATH, users)
        return True

    def put_session(self, token: str, payload: dict) -> None:
        with _lock:
            sessions = _read(SESSIONS_PATH, {})
            sessions[token] = payload
            _write(SESSIONS_PATH, sessions)

    def get_session(self, token: str) -> dict | None:
        with _lock:
            return _read(SESSIONS_PATH, {}).get(token)

    def drop_session(self, token: str) -> None:
        with _lock:
            sessions = _read(SESSIONS_PATH, {})
            if sessions.pop(token, None) is not None:
                _write(SESSIONS_PATH, sessions)

    def get_avatar(self, key: str) -> str | None:
        with _lock:
            return _read(AVATARS_PATH, {}).get(key)

    def set_avatar(self, key: str, avatar: str | None) -> None:
        with _lock:
            avatars = _read(AVATARS_PATH, {})
            if avatar is None:
                avatars.pop(key, None)
            else:
                avatars[key] = avatar
            _write(AVATARS_PATH, avatars)

    def add_path(self, key: str, entry: dict) -> None:
        with _lock:
            records = _read(PATHS_PATH, [])
            records.append(entry)
            _write(PATHS_PATH, records)

    def user_paths(self, key: str) -> list[dict]:
        with _lock:
            records = _read(PATHS_PATH, [])
        return [item for item in records if item.get("user") == key]

    def drop_path(self, key: str, entry_id: str) -> bool:
        with _lock:
            records = _read(PATHS_PATH, [])
            remaining = [
                item
                for item in records
                if not (item.get("id") == entry_id and item.get("user") == key)
            ]
            if len(remaining) == len(records):
                return False
            _write(PATHS_PATH, remaining)
        return True


class _RedisStore:
    """Upstash Redis over its REST API, using only the standard library.

    Every operation is a single Redis command, so there is no read-modify-write
    cycle for concurrent function instances to lose. Account creation relies on
    HSETNX, which claims a username atomically.
    """

    name = "redis"

    def __init__(self, url: str, token: str, prefix: str) -> None:
        self._url = url
        self._token = token
        self._prefix = prefix

    def _key(self, *parts: str) -> str:
        return ":".join((self._prefix, *parts))

    def _command(self, *args: str):
        body = json.dumps(list(args)).encode("utf-8")
        request = urllib.request.Request(
            self._url,
            data=body,
            headers={
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            raise StoreError(f"Redis returned HTTP {error.code}.") from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise StoreError(f"Redis is unreachable: {error}") from error

        if isinstance(payload, dict) and payload.get("error"):
            raise StoreError(f"Redis error: {payload['error']}")
        return payload.get("result") if isinstance(payload, dict) else None

    @staticmethod
    def _decode(value) -> dict | None:
        if value is None:
            return None
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return None

    def get_user(self, key: str) -> dict | None:
        return self._decode(self._command("HGET", self._key("users"), key))

    def all_users(self) -> dict:
        raw = self._command("HGETALL", self._key("users"))
        if isinstance(raw, dict):
            pairs = raw.items()
        elif isinstance(raw, list):
            pairs = zip(raw[0::2], raw[1::2])
        else:
            return {}
        return {field: self._decode(value) for field, value in pairs}

    def claim_user(self, key: str, record: dict) -> bool:
        claimed = self._command(
            "HSETNX", self._key("users"), key, json.dumps(record, ensure_ascii=False)
        )
        return bool(claimed)

    def put_session(self, token: str, payload: dict) -> None:
        self._command(
            "SET", self._key("session", token), json.dumps(payload, ensure_ascii=False)
        )

    def get_session(self, token: str) -> dict | None:
        return self._decode(self._command("GET", self._key("session", token)))

    def drop_session(self, token: str) -> None:
        self._command("DEL", self._key("session", token))

    def get_avatar(self, key: str) -> str | None:
        value = self._command("HGET", self._key("avatars"), key)
        return value if isinstance(value, str) else None

    def set_avatar(self, key: str, avatar: str | None) -> None:
        if avatar is None:
            self._command("HDEL", self._key("avatars"), key)
        else:
            self._command("HSET", self._key("avatars"), key, avatar)

    def add_path(self, key: str, entry: dict) -> None:
        self._command(
            "HSET",
            self._key("paths", key),
            entry["id"],
            json.dumps(entry, ensure_ascii=False),
        )

    def user_paths(self, key: str) -> list[dict]:
        raw = self._command("HVALS", self._key("paths", key))
        if not isinstance(raw, list):
            return []
        return [item for item in (self._decode(value) for value in raw) if item]

    def drop_path(self, key: str, entry_id: str) -> bool:
        return bool(self._command("HDEL", self._key("paths", key), entry_id))


_store_instance: _JsonStore | _RedisStore | None = None


def _store() -> _JsonStore | _RedisStore:
    global _store_instance
    if _store_instance is None:
        if REDIS_URL and REDIS_TOKEN:
            _store_instance = _RedisStore(REDIS_URL, REDIS_TOKEN, REDIS_PREFIX)
        else:
            _store_instance = _JsonStore()
    return _store_instance


def active_backend() -> str:
    """Which store is in use: 'redis' on the deployment, 'json' locally."""
    return _store().name


def _hash_password(password: str, salt: str) -> str:
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS
    )
    return derived.hex()


def _key(username: str) -> str:
    return username.strip().lower()


def _issue_token(username: str) -> str:
    token = secrets.token_urlsafe(32)
    _store().put_session(token, {"user": _key(username), "created_at": _now()})
    return token


def check_username(username: str) -> tuple[bool, str | None]:
    """Whether `username` is well-formed and unclaimed, with a reason if not."""
    username = username.strip()
    if not USERNAME_RE.match(username):
        return False, (
            "Usernames are 3-32 characters, using letters, numbers, dot, dash "
            "or underscore."
        )
    if _store().get_user(_key(username)) is not None:
        return False, f"“{username}” is already taken."
    return True, None


def register(username: str, password: str) -> tuple[str, dict]:
    username = username.strip()
    if not USERNAME_RE.match(username):
        raise AuthError(
            "Usernames are 3-32 characters, using letters, numbers, dot, dash "
            "or underscore.",
        )
    if len(password) < MIN_PASSWORD:
        raise AuthError(f"Passwords need at least {MIN_PASSWORD} characters.")

    salt = secrets.token_hex(16)
    record = {
        "username": username,
        "salt": salt,
        "password_hash": _hash_password(password, salt),
        "created_at": _now(),
    }
    # Names are claimed case-insensitively, so "Andrea" cannot be taken once
    # "andrea" exists. The claim itself is atomic.
    if not _store().claim_user(_key(username), record):
        raise AuthError(f"“{username}” is already taken. Try signing in instead.", 409)
    return _issue_token(username), {"username": username}


def login(username: str, password: str) -> tuple[str, dict]:
    record = _store().get_user(_key(username))
    # Hash even when the user is unknown so a missing account and a wrong
    # password take a similar amount of time.
    salt = record["salt"] if record else secrets.token_hex(16)
    candidate = _hash_password(password, salt)
    if record is None or not hmac.compare_digest(candidate, record["password_hash"]):
        raise AuthError("Incorrect username or password.", 401)
    return _issue_token(record["username"]), {"username": record["username"]}


def user_for_token(token: str) -> str | None:
    if not token:
        return None
    session = _store().get_session(token)
    if session is None:
        return None
    record = _store().get_user(session["user"])
    return record["username"] if record else None


def logout(token: str) -> None:
    _store().drop_session(token)


def get_avatar(username: str) -> str | None:
    return _store().get_avatar(_key(username))


def set_avatar(username: str, avatar: str | None) -> str | None:
    if avatar is not None:
        avatar = avatar.strip()
        if len(avatar) > MAX_AVATAR_CHARS:
            raise AuthError("That image is too large. Try a smaller one.", 413)
        if not AVATAR_RE.match(avatar):
            raise AuthError("Profile pictures must be a PNG, JPEG or WebP image.")

    _store().set_avatar(_key(username), avatar)
    return avatar


def save_path(username: str, record: dict) -> dict:
    entry = {
        "id": uuid.uuid4().hex[:12],
        "user": _key(username),
        "saved_at": _now(),
        **record,
    }
    _store().add_path(_key(username), entry)
    return entry


def list_paths(username: str) -> list[dict]:
    mine = _store().user_paths(_key(username))
    return sorted(mine, key=lambda item: item.get("saved_at", ""), reverse=True)


def get_path(username: str, entry_id: str) -> dict | None:
    return next(
        (item for item in list_paths(username) if item.get("id") == entry_id), None
    )


def delete_path(username: str, entry_id: str) -> bool:
    return _store().drop_path(_key(username), entry_id)
