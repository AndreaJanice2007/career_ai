"""Copy the local JSON store into Upstash Redis, then verify what landed there.

Reads backend/data/*.json without modifying them and writes the same records
through the Redis backend in backend/app/storage.py, so the data ends up in the
exact shape the deployed API expects.

    set KV_REST_API_URL=https://...upstash.io
    set KV_REST_API_TOKEN=...
    python scripts/migrate_store.py            # migrate, then verify
    python scripts/migrate_store.py --verify   # verify only, write nothing

Re-running is safe: existing accounts are left alone unless --overwrite-users is
given, and saved paths, sessions and avatars are keyed by id, token and
username, so they are replaced rather than duplicated.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.app import storage  # noqa: E402


def load(path: pathlib.Path, fallback):
    if not path.exists():
        return fallback
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def migrate(store, overwrite_users: bool) -> dict[str, int]:
    counts = {"users": 0, "sessions": 0, "avatars": 0, "paths": 0, "legacy_paths": 0}

    for key, record in load(storage.USERS_PATH, {}).items():
        if store.claim_user(key, record):
            counts["users"] += 1
        elif overwrite_users:
            store._command(  # noqa: SLF001 - deliberate overwrite of an existing field
                "HSET",
                store._key("users"),
                key,
                json.dumps(record, ensure_ascii=False),
            )
            counts["users"] += 1
        else:
            print(f"  users: '{key}' already present, left as is")

    for token, session in load(storage.SESSIONS_PATH, {}).items():
        store.put_session(token, session)
        counts["sessions"] += 1

    for key, avatar in load(storage.AVATARS_PATH, {}).items():
        store.set_avatar(key, avatar)
        counts["avatars"] += 1

    for entry in load(storage.PATHS_PATH, []):
        # A few early entries were saved before accounts existed and carry no
        # 'user' field. They are invisible in the app either way; they are
        # copied verbatim so the migration loses nothing.
        store.add_path(entry.get("user", ""), entry)
        counts["paths"] += 1
        if "user" not in entry:
            counts["legacy_paths"] += 1

    return counts


def verify(store) -> bool:
    """Compare every local record against what Redis returns."""
    ok = True

    local_users = load(storage.USERS_PATH, {})
    remote_users = store.all_users()
    for key, record in local_users.items():
        remote = remote_users.get(key)
        if remote != record:
            ok = False
            print(f"  MISMATCH user '{key}'")
    print(f"  users:    {len(local_users)} local, {len(remote_users)} in redis")

    local_sessions = load(storage.SESSIONS_PATH, {})
    matched = sum(
        1 for token, s in local_sessions.items() if store.get_session(token) == s
    )
    ok = ok and matched == len(local_sessions)
    print(f"  sessions: {len(local_sessions)} local, {matched} verified in redis")

    local_avatars = load(storage.AVATARS_PATH, {})
    matched = sum(
        1 for key, value in local_avatars.items() if store.get_avatar(key) == value
    )
    ok = ok and matched == len(local_avatars)
    print(f"  avatars:  {len(local_avatars)} local, {matched} verified in redis")

    local_paths = load(storage.PATHS_PATH, [])
    remote_paths = {}
    for user in {entry.get("user", "") for entry in local_paths}:
        for entry in store.user_paths(user):
            remote_paths[entry["id"]] = entry
    matched = sum(1 for entry in local_paths if remote_paths.get(entry["id"]) == entry)
    ok = ok and matched == len(local_paths)
    legacy = sum(1 for entry in local_paths if "user" not in entry)
    suffix = f" ({legacy} pre-accounts entries carried over)" if legacy else ""
    print(f"  paths:    {len(local_paths)} local, {matched} verified in redis{suffix}")

    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="verify without writing")
    parser.add_argument(
        "--overwrite-users",
        action="store_true",
        help="replace accounts that already exist in Redis",
    )
    args = parser.parse_args()

    if storage.active_backend() != "redis":
        print(
            "Redis credentials not found. Set KV_REST_API_URL and KV_REST_API_TOKEN "
            "(or the UPSTASH_REDIS_REST_* pair) first.",
            file=sys.stderr,
        )
        return 2

    store = storage._store()  # noqa: SLF001 - the migration talks to the backend directly
    print(f"source: {storage.DATA_DIR}")
    print(f"target: {storage.REDIS_URL}\n")

    if not args.verify:
        print("migrating:")
        counts = migrate(store, args.overwrite_users)
        print(
            f"  wrote {counts['users']} users, {counts['sessions']} sessions, "
            f"{counts['avatars']} avatars, {counts['paths']} saved paths\n"
        )

    print("verifying:")
    if verify(store):
        print("\nAll records match.")
        return 0

    print("\nSome records did not match. Nothing local was changed.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
