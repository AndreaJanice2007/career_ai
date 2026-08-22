"""JSON-file store for accounts, sessions and saved career paths.

Deliberately file-backed rather than a database: the app is a local single-node
tool, and keeping the data as readable JSON means it survives a rebuild and can
be inspected by hand. Passwords are never stored in the clear.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
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

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,32}$")
AVATAR_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
# A 256px square thumbnail lands well under this; the cap stops the JSON store
# from being used as a file dump.
MAX_AVATAR_CHARS = 600_000
MIN_PASSWORD = 6
PBKDF2_ROUNDS = 200_000

_lock = Lock()


class AuthError(Exception):
    """Raised for any credential problem the caller should surface as 401/409."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


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


def _hash_password(password: str, salt: str) -> str:
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS
    )
    return derived.hex()


def _key(username: str) -> str:
    return username.strip().lower()


def _issue_token(username: str) -> str:
    token = secrets.token_urlsafe(32)
    sessions = _read(SESSIONS_PATH, {})
    sessions[token] = {"user": _key(username), "created_at": _now()}
    _write(SESSIONS_PATH, sessions)
    return token


def check_username(username: str) -> tuple[bool, str | None]:
    """Whether `username` is well-formed and unclaimed, with a reason if not."""
    username = username.strip()
    if not USERNAME_RE.match(username):
        return False, (
            "Usernames are 3-32 characters, using letters, numbers, dot, dash "
            "or underscore."
        )
    with _lock:
        taken = _key(username) in _read(USERS_PATH, {})
    if taken:
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

    with _lock:
        users = _read(USERS_PATH, {})
        # Names are claimed case-insensitively, so "Andrea" cannot be taken
        # once "andrea" exists.
        if _key(username) in users:
            raise AuthError(
                f"“{username}” is already taken. Try signing in instead.", 409
            )
        salt = secrets.token_hex(16)
        users[_key(username)] = {
            "username": username,
            "salt": salt,
            "password_hash": _hash_password(password, salt),
            "created_at": _now(),
        }
        _write(USERS_PATH, users)
        token = _issue_token(username)
    return token, {"username": username}


def login(username: str, password: str) -> tuple[str, dict]:
    with _lock:
        users = _read(USERS_PATH, {})
        record = users.get(_key(username))
        # Hash even when the user is unknown so a missing account and a wrong
        # password take a similar amount of time.
        salt = record["salt"] if record else secrets.token_hex(16)
        candidate = _hash_password(password, salt)
        if record is None or not hmac.compare_digest(
            candidate, record["password_hash"]
        ):
            raise AuthError("Incorrect username or password.", 401)
        token = _issue_token(record["username"])
    return token, {"username": record["username"]}


def user_for_token(token: str) -> str | None:
    if not token:
        return None
    with _lock:
        session = _read(SESSIONS_PATH, {}).get(token)
        if session is None:
            return None
        users = _read(USERS_PATH, {})
        record = users.get(session["user"])
    return record["username"] if record else None


def logout(token: str) -> None:
    with _lock:
        sessions = _read(SESSIONS_PATH, {})
        if sessions.pop(token, None) is not None:
            _write(SESSIONS_PATH, sessions)


def get_avatar(username: str) -> str | None:
    with _lock:
        return _read(AVATARS_PATH, {}).get(_key(username))


def set_avatar(username: str, avatar: str | None) -> str | None:
    if avatar is not None:
        avatar = avatar.strip()
        if len(avatar) > MAX_AVATAR_CHARS:
            raise AuthError("That image is too large. Try a smaller one.", 413)
        if not AVATAR_RE.match(avatar):
            raise AuthError("Profile pictures must be a PNG, JPEG or WebP image.")

    with _lock:
        avatars = _read(AVATARS_PATH, {})
        if avatar is None:
            avatars.pop(_key(username), None)
        else:
            avatars[_key(username)] = avatar
        _write(AVATARS_PATH, avatars)
    return avatar


def save_path(username: str, record: dict) -> dict:
    entry = {
        "id": uuid.uuid4().hex[:12],
        "user": _key(username),
        "saved_at": _now(),
        **record,
    }
    with _lock:
        records = _read(PATHS_PATH, [])
        records.append(entry)
        _write(PATHS_PATH, records)
    return entry


def list_paths(username: str) -> list[dict]:
    with _lock:
        records = _read(PATHS_PATH, [])
    mine = [item for item in records if item.get("user") == _key(username)]
    return sorted(mine, key=lambda item: item.get("saved_at", ""), reverse=True)


def get_path(username: str, entry_id: str) -> dict | None:
    return next(
        (item for item in list_paths(username) if item.get("id") == entry_id), None
    )


def delete_path(username: str, entry_id: str) -> bool:
    with _lock:
        records = _read(PATHS_PATH, [])
        remaining = [
            item
            for item in records
            if not (item.get("id") == entry_id and item.get("user") == _key(username))
        ]
        if len(remaining) == len(records):
            return False
        _write(PATHS_PATH, remaining)
    return True
