"""Request and response models for the career recommendation API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SkillProfile(BaseModel):
    software_skills: list[str] = Field(default_factory=list)
    essential_skills: list[str] = Field(default_factory=list)


class RecommendRequest(SkillProfile):
    top_n: int = Field(default=5, ge=1, le=25)


class AnalyzeRequest(SkillProfile):
    career: str
    peers: list[str] = Field(
        default_factory=list,
        description="Other recommended careers, used to prioritise shared skills.",
    )


class CareerMatch(BaseModel):
    code: str
    title: str
    description: str
    match: float
    confidence: float
    fit: float
    readiness: float
    interests: list[str]
    required_software: int
    required_essential: int


class RecommendResponse(BaseModel):
    recommendations: list[CareerMatch]
    unknown_skills: list[str]
    skills_used: int


class RoadmapStep(BaseModel):
    order: int
    skill: str
    kind: str
    phase: str
    reach: int
    examples: list[str]
    hot: bool
    in_demand: bool
    why: str


class CareerSummary(BaseModel):
    code: str
    title: str
    description: str
    interests: list[str]


class SkillSets(BaseModel):
    software: list[str]
    essential: list[str]


class AnalyzeResponse(BaseModel):
    career: CareerSummary
    readiness: float
    matched: SkillSets
    missing: SkillSets
    extra_software: list[str]
    roadmap: list[RoadmapStep]


class SoftwareSkillOption(BaseModel):
    name: str
    hot: bool
    in_demand: bool
    examples: list[str]
    reach: int


class EssentialSkillOption(BaseModel):
    name: str
    reach: int


class SkillCatalog(BaseModel):
    software: list[SoftwareSkillOption]
    essential: list[EssentialSkillOption]


class CareerDetail(CareerSummary):
    software: list[str]
    essential: list[str]


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class Account(BaseModel):
    username: str
    saved_paths: int = 0
    avatar: str | None = None


class AvatarRequest(BaseModel):
    avatar: str | None = Field(
        default=None, description="Data URL for the image, or null to remove it."
    )


class AuthResponse(BaseModel):
    token: str
    user: Account


class UsernameCheck(BaseModel):
    username: str
    available: bool
    reason: str | None = None


class SavePathRequest(BaseModel):
    career: str
    match: float = 0.0
    readiness: float = 0.0
    software_skills: list[str] = Field(default_factory=list)
    essential_skills: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class SavedPath(BaseModel):
    id: str
    saved_at: str
    name: str
    career: str
    match: float
    readiness: float
    software_skills: list[str]
    essential_skills: list[str]
    next_steps: list[str]


class ModelMetric(BaseModel):
    model: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    seconds: float


class MetricsResponse(BaseModel):
    metrics: list[ModelMetric]
    readiness_r2: float
    stats: dict
    trained_at: str
    served_model: str
