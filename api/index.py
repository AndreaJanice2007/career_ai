"""Vercel entrypoint.

Vercel serves the ASGI object named `app` from this file. It is the same object
that `python -m uvicorn backend.app.main:app` runs locally: imported, never
redefined, so there is exactly one FastAPI application and one set of routes.
"""

import pathlib
import sys

# Vercel imports this file directly, so the repository root has to be on the
# path before `backend.app.main` can be resolved.
ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import app  # noqa: E402,F401
