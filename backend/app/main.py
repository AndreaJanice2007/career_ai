"""FastAPI service for Career Nova, the AI career recommendation web app."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import storage
from .recommender import ArtifactMissingError, get_recommender
from .schemas import (
    Account,
    AnalyzeRequest,
    AnalyzeResponse,
    AuthResponse,
    AvatarRequest,
    CareerDetail,
    CareerSummary,
    Credentials,
    MetricsResponse,
    RecommendRequest,
    RecommendResponse,
    SavedPath,
    SavePathRequest,
    SkillCatalog,
    UsernameCheck,
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

DEV_ORIGINS = [
    "http://careernova",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Loading the artifact takes a moment; do it at boot so the first request
    # is not the one that pays for it.
    try:
        get_recommender()
    except ArtifactMissingError as error:
        print(f"[api] {error}")
    yield


app = FastAPI(
    title="Career Nova API",
    description="Career recommendations, skill-gap analysis and learning roadmaps "
    "built on O*NET occupational data.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def recommender():
    try:
        return get_recommender()
    except ArtifactMissingError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def bearer_token(authorization: str = Header(default="")) -> str:
    scheme, _, token = authorization.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


def current_user(token: str = Depends(bearer_token)) -> str:
    username = storage.user_for_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return username


def account(username: str) -> Account:
    return Account(
        username=username,
        saved_paths=len(storage.list_paths(username)),
        avatar=storage.get_avatar(username),
    )


@app.get("/api/health")
def health() -> dict:
    try:
        engine = get_recommender()
    except ArtifactMissingError as error:
        return {"status": "model-missing", "detail": str(error)}
    return {
        "status": "ok",
        "careers": len(engine.careers),
        "trained_at": engine.trained_at,
    }


@app.get("/api/skills", response_model=SkillCatalog)
def skills() -> SkillCatalog:
    return SkillCatalog(**recommender().skill_catalog())


@app.get("/api/careers", response_model=list[CareerSummary])
def careers(search: str = "", limit: int = 50) -> list[CareerSummary]:
    engine = recommender()
    query = search.strip().lower()
    matches = [
        career
        for career in engine.careers
        if not query or query in career["title"].lower()
    ]
    return [
        CareerSummary(
            code=career["code"],
            title=career["title"],
            description=career["description"],
            interests=career["interests"],
        )
        for career in matches[: max(1, min(limit, 200))]
    ]


@app.get("/api/careers/{title}", response_model=CareerDetail)
def career_detail(title: str) -> CareerDetail:
    career = recommender().get_career(title)
    if career is None:
        raise HTTPException(status_code=404, detail=f"Unknown career: {title}")
    return CareerDetail(**career)


@app.post("/api/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest) -> RecommendResponse:
    engine = recommender()
    software, essential, unknown = engine.split_known(
        request.software_skills + request.essential_skills
    )
    if not software and not essential:
        raise HTTPException(
            status_code=400,
            detail="Select at least one known skill to get recommendations.",
        )
    return RecommendResponse(
        recommendations=engine.recommend(software, essential, request.top_n),
        unknown_skills=unknown,
        skills_used=len(software) + len(essential),
    )


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    engine = recommender()
    if engine.get_career(request.career) is None:
        raise HTTPException(status_code=404, detail=f"Unknown career: {request.career}")
    software, essential, _ = engine.split_known(
        request.software_skills + request.essential_skills
    )
    return AnalyzeResponse(
        **engine.analyze(request.career, software, essential, request.peers)
    )


@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(credentials: Credentials) -> AuthResponse:
    try:
        token, user = storage.register(credentials.username, credentials.password)
    except storage.AuthError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    return AuthResponse(token=token, user=account(user["username"]))


@app.post("/api/auth/login", response_model=AuthResponse)
def login(credentials: Credentials) -> AuthResponse:
    try:
        token, user = storage.login(credentials.username, credentials.password)
    except storage.AuthError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    return AuthResponse(token=token, user=account(user["username"]))


@app.get("/api/auth/available", response_model=UsernameCheck)
def username_available(username: str = "") -> UsernameCheck:
    available, reason = storage.check_username(username)
    return UsernameCheck(username=username.strip(), available=available, reason=reason)


@app.get("/api/auth/me", response_model=Account)
def me(username: str = Depends(current_user)) -> Account:
    return account(username)


@app.put("/api/auth/avatar", response_model=Account)
def set_avatar(
    request: AvatarRequest, username: str = Depends(current_user)
) -> Account:
    try:
        storage.set_avatar(username, request.avatar)
    except storage.AuthError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    return account(username)


@app.post("/api/auth/logout", status_code=204)
def logout(token: str = Depends(bearer_token)) -> None:
    storage.logout(token)


@app.post("/api/saved-paths", response_model=SavedPath, status_code=201)
def save_career_path(
    request: SavePathRequest, username: str = Depends(current_user)
) -> SavedPath:
    payload = request.model_dump()
    # Paths are filed under the account, so there is nothing to name.
    payload["name"] = username
    return SavedPath(**storage.save_path(username, payload))


@app.get("/api/saved-paths", response_model=list[SavedPath])
def saved_paths(username: str = Depends(current_user)) -> list[SavedPath]:
    return [SavedPath(**item) for item in storage.list_paths(username)]


@app.get("/api/saved-paths/{entry_id}", response_model=SavedPath)
def saved_path(entry_id: str, username: str = Depends(current_user)) -> SavedPath:
    entry = storage.get_path(username, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Saved path not found.")
    return SavedPath(**entry)


@app.delete("/api/saved-paths/{entry_id}", status_code=204)
def delete_saved_path(entry_id: str, username: str = Depends(current_user)) -> None:
    if not storage.delete_path(username, entry_id):
        raise HTTPException(status_code=404, detail="Saved path not found.")


@app.get("/api/metrics", response_model=MetricsResponse)
def metrics() -> MetricsResponse:
    engine = recommender()
    return MetricsResponse(
        metrics=engine.metrics,
        readiness_r2=engine.readiness_r2,
        stats=engine.stats,
        trained_at=engine.trained_at,
        served_model="Logistic Regression",
    )


# Serve the built frontend from the same origin in production. Mounted last so
# the API routes above always win. A partial build is ignored rather than
# mounted, otherwise a missing assets folder would stop the API from starting.
if (FRONTEND_DIST / "index.html").is_file() and (FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
