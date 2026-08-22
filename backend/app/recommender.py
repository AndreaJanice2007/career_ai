"""Serving logic: career recommendations, skill-gap analysis and learning roadmap."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

ARTIFACT_PATH = Path(__file__).resolve().parent.parent / "artifacts" / "model.joblib"

# Weight of the classifier's confidence against the skill-fit score. Measured
# with backend/eval_ranking.py: the classifier alone recovers the true career in
# the top 5 only 38% of the time from a 5-skill query, versus 85% for skill fit,
# because it was trained on profiles holding ~70% of a career's skills. A small
# weight keeps the trained model in the ranking without degrading it.
MODEL_WEIGHT = 0.1

# Favours careers that use most of what you already have over careers that
# merely have a short requirement list. Chosen by sweep in eval_ranking.py.
FIT_BETA = 0.25

PHASES = ("Foundations", "Core Tools", "Specialisation")


class ArtifactMissingError(RuntimeError):
    pass


class Recommender:
    def __init__(self, artifact_path: Path = ARTIFACT_PATH):
        if not artifact_path.exists():
            raise ArtifactMissingError(
                f"Model artifact not found at {artifact_path}. "
                "Run 'python backend/train.py' first."
            )
        artifact = joblib.load(artifact_path)
        self.model = artifact["model"]
        self.mlb_software = artifact["mlb_software"]
        self.mlb_essential = artifact["mlb_essential"]
        self.feature_names: list[str] = artifact["feature_names"]
        self.software_skills: list[str] = artifact["software_skills"]
        self.essential_skills: list[str] = artifact["essential_skills"]
        self.software_meta: dict[str, dict] = artifact["software_meta"]
        self.careers: list[dict] = artifact["careers"]
        self.metrics: list[dict] = artifact["metrics"]
        self.readiness_r2: float = artifact["readiness_r2"]
        self.stats: dict = artifact["stats"]
        self.trained_at: str = artifact["trained_at"]

        self._by_title = {career["title"]: career for career in self.careers}
        self._software_set = set(self.software_skills)
        self._essential_set = set(self.essential_skills)
        self._classes = list(self.model.classes_)
        self._feature_index = {name: i for i, name in enumerate(self.feature_names)}
        self._essential_reach_by_skill = {
            skill: sum(1 for career in self.careers if skill in career["essential"])
            for skill in self.essential_skills
        }
        self._build_fit_index()

    def _build_fit_index(self) -> None:
        """IDF-weighted requirement vectors for every class the model can output.

        Skills like "Spreadsheet software" appear in most occupations and say
        almost nothing about a person, while "Web platform development
        software" is highly diagnostic. Weighting by inverse document frequency
        stops ubiquitous skills from dominating the ranking.
        """
        rows = np.zeros((len(self._classes), len(self.feature_names)))
        for row, title in enumerate(self._classes):
            career = self._by_title.get(title)
            if career is None:
                continue
            for skill in career["software"] + career["essential"]:
                column = self._feature_index.get(skill)
                if column is not None:
                    rows[row, column] = 1.0

        document_frequency = rows.sum(axis=0)
        self._idf = np.log((len(self._classes) + 1) / (document_frequency + 1)) + 1.0
        self._requirements = rows
        self._requirement_mass = (rows * self._idf).sum(axis=1)
        self._requirement_mass[self._requirement_mass == 0] = 1.0

    def _skill_fit(self, vector: np.ndarray) -> np.ndarray:
        """F-score between the entered skills and each career's requirements.

        Precision is the share of the entered skills a career actually uses;
        recall is the share of the career's requirements already held. Beta
        below 1 leans towards precision so a broad occupation is not punished
        for its long requirement list.
        """
        user = vector.ravel() * self._idf
        user_mass = user.sum()
        if user_mass == 0:
            return np.zeros(len(self._classes))

        matched = (self._requirements * user).sum(axis=1)
        precision = matched / user_mass
        recall = matched / self._requirement_mass
        denominator = FIT_BETA**2 * precision + recall
        denominator[denominator == 0] = 1e-9
        return (1 + FIT_BETA**2) * precision * recall / denominator

    # ------------------------------------------------------------------ input

    def split_known(self, skills: list[str]) -> tuple[list[str], list[str], list[str]]:
        """Partition raw input into known software, known essential and unknown."""
        software, essential, unknown = [], [], []
        for skill in dict.fromkeys(s.strip() for s in skills if s and s.strip()):
            if skill in self._software_set:
                software.append(skill)
            elif skill in self._essential_set:
                essential.append(skill)
            else:
                unknown.append(skill)
        return software, essential, unknown

    def vectorize(self, software: list[str], essential: list[str]) -> np.ndarray:
        known_software = [s for s in software if s in self._software_set]
        known_essential = [s for s in essential if s in self._essential_set]
        left = self.mlb_software.transform([known_software])
        right = self.mlb_essential.transform([known_essential])
        return np.hstack([left, right]).astype(np.float64)

    # ------------------------------------------------------------- prediction

    def recommend(
        self, software: list[str], essential: list[str], top_n: int = 5
    ) -> list[dict]:
        """Rank careers by skill fit, nudged by the trained classifier."""
        vector = self.vectorize(software, essential)
        probabilities = self.model.predict_proba(vector)[0]
        fit = self._skill_fit(vector)

        best_probability = float(probabilities.max()) or 1.0
        blended = (
            MODEL_WEIGHT * (probabilities / best_probability)
            + (1 - MODEL_WEIGHT) * fit
        ) * 100

        have_software = set(software)
        have_essential = set(essential)
        top_n = max(1, min(top_n, len(blended)))
        order = np.argsort(blended)[-top_n:][::-1]

        results = []
        for index in order:
            career = self._by_title.get(self._classes[index])
            if career is None:
                continue
            results.append(
                {
                    "code": career["code"],
                    "title": career["title"],
                    "description": career["description"],
                    "match": round(float(blended[index]), 2),
                    "confidence": round(float(probabilities[index]) * 100, 2),
                    "fit": round(float(fit[index]) * 100, 2),
                    "readiness": round(
                        self.readiness(career, have_software, have_essential), 2
                    ),
                    "interests": career["interests"],
                    "required_software": len(career["software"]),
                    "required_essential": len(career["essential"]),
                }
            )
        return results

    @staticmethod
    def readiness(career: dict, software: set[str], essential: set[str]) -> float:
        """Mean coverage of the career's requirement groups, as a percentage."""
        parts = []
        if career["software"]:
            required = set(career["software"])
            parts.append(len(required & software) / len(required))
        if career["essential"]:
            required = set(career["essential"])
            parts.append(len(required & essential) / len(required))
        if not parts:
            return 0.0
        return sum(parts) / len(parts) * 100

    # ---------------------------------------------------------------- analysis

    def get_career(self, title: str) -> dict | None:
        return self._by_title.get(title)

    def analyze(
        self,
        title: str,
        software: list[str],
        essential: list[str],
        peer_titles: list[str] | None = None,
    ) -> dict:
        career = self._by_title[title]
        have_software = set(software)
        have_essential = set(essential)
        required_software = set(career["software"])
        required_essential = set(career["essential"])

        matched_software = sorted(required_software & have_software)
        matched_essential = sorted(required_essential & have_essential)
        missing_software = sorted(required_software - have_software)
        missing_essential = sorted(required_essential - have_essential)

        return {
            "career": {
                "code": career["code"],
                "title": career["title"],
                "description": career["description"],
                "interests": career["interests"],
            },
            "readiness": round(
                self.readiness(career, have_software, have_essential), 2
            ),
            "matched": {
                "software": matched_software,
                "essential": matched_essential,
            },
            "missing": {
                "software": missing_software,
                "essential": missing_essential,
            },
            "extra_software": sorted(have_software - required_software),
            "roadmap": self.roadmap(
                missing_software, missing_essential, peer_titles or []
            ),
        }

    def roadmap(
        self,
        missing_software: list[str],
        missing_essential: list[str],
        peer_titles: list[str],
        per_phase: int = 3,
    ) -> list[dict]:
        """Split the gaps into three phases, each with its own selection rule.

        Ranking every gap on one scale buries the interesting skills under
        ubiquitous office tools, so each phase answers a different question:
        what underpins any job, what is broadly transferable, and what actually
        distinguishes this role.
        """
        peers = [self._by_title[t] for t in peer_titles if t in self._by_title]

        def shared_by(skill: str) -> int:
            return sum(1 for peer in peers if skill in peer["software"])

        by_reach = sorted(
            missing_software,
            key=lambda skill: (
                int(self.software_meta.get(skill, {}).get("career_count", 0)),
                shared_by(skill),
            ),
            reverse=True,
        )
        widely_used = by_reach[: len(by_reach) // 2] or by_reach
        specialised = [skill for skill in reversed(by_reach) if skill not in widely_used]
        pools = [
            (
                "essential",
                PHASES[0],
                sorted(
                    missing_essential,
                    key=lambda skill: (shared_by(skill), skill),
                    reverse=True,
                ),
            ),
            ("software", PHASES[1], widely_used),
            # The rarest requirements are what make the occupation distinct, so
            # they close out the roadmap rather than never appearing.
            ("software", PHASES[2], specialised),
        ]

        # Phases are capped so no single one floods the timeline, but a short
        # phase hands its budget to the others instead of shortening the plan.
        budget = per_phase * len(pools)
        counts = [min(per_phase, len(pool)) for _, _, pool in pools]
        for index, (_, _, pool) in enumerate(pools):
            spare = budget - sum(counts)
            if spare <= 0:
                break
            counts[index] += min(spare, len(pool) - counts[index])

        steps: list[dict] = []
        for (kind, phase, pool), take in zip(pools, counts):
            for skill in pool[:take]:
                steps.append(self._step(skill, kind, phase, len(peers)))

        for index, step in enumerate(steps):
            step["order"] = index + 1
        return steps

    def _step(self, skill: str, kind: str, phase: str, peer_count: int) -> dict:
        meta = self.software_meta.get(skill, {}) if kind == "software" else {}
        reach = (
            int(meta.get("career_count", 0))
            if kind == "software"
            else self._essential_reach(skill)
        )
        step = {
            "skill": skill,
            "kind": kind,
            "phase": phase,
            "reach": reach,
            "examples": list(meta.get("examples", []))[:4],
            "hot": bool(meta.get("hot")),
            "in_demand": bool(meta.get("in_demand")),
        }
        step["why"] = self._explain(step, phase, peer_count)
        return step

    def _essential_reach(self, skill: str) -> int:
        return self._essential_reach_by_skill.get(skill, 0)

    def _explain(self, step: dict, phase: str, peer_count: int) -> str:
        reach = step["reach"]
        if step["kind"] == "essential":
            return f"A core work skill expected in {reach} of the occupations analysed."

        flags = []
        if step["hot"]:
            flags.append("a hot technology")
        if step["in_demand"]:
            flags.append("in demand")
        flag_note = f" It is flagged as {' and '.join(flags)}." if flags else ""

        if phase == PHASES[1]:
            peer_note = (
                f" It carries over to {peer_count} of your top matches."
                if peer_count > 1
                else ""
            )
            return (
                f"Broadly transferable: used in {reach} occupations.{flag_note}{peer_note}"
            )
        return (
            f"Specialised: required by only {reach} occupations, which is part of "
            f"what makes this role distinct.{flag_note}"
        )

    # -------------------------------------------------------------- catalogue

    def skill_catalog(self) -> dict:
        software = [
            {
                "name": name,
                "hot": bool(self.software_meta.get(name, {}).get("hot")),
                "in_demand": bool(self.software_meta.get(name, {}).get("in_demand")),
                "examples": self.software_meta.get(name, {}).get("examples", [])[:4],
                "reach": int(self.software_meta.get(name, {}).get("career_count", 0)),
            }
            for name in self.software_skills
        ]
        software.sort(key=lambda item: item["reach"], reverse=True)
        essential = [
            {"name": name, "reach": self._essential_reach(name)}
            for name in self.essential_skills
        ]
        return {"software": software, "essential": essential}


@lru_cache(maxsize=1)
def get_recommender() -> Recommender:
    return Recommender()
