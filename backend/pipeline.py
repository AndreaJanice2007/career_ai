"""Rebuilds the career dataset and synthetic student profiles from the raw O*NET CSVs.

This mirrors the data preparation cells of AI_career_recommendation.ipynb so the
web app can be trained and served without executing the notebook.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent

CSV_FILES = {
    "occupation": "occupation_data.csv",
    "software": "software_skills.csv",
    "essential": "essential_skills.csv",
    "interest": "career_interest_types.csv",
}

PER_CAREER = 10
KEEP_RATIO = 0.7
SEED = 42


def load_raw(data_dir: Path = DATA_DIR) -> dict[str, pd.DataFrame]:
    frames = {}
    for key, filename in CSV_FILES.items():
        path = data_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing dataset: {path}")
        frame = pd.read_csv(path)
        for column in ("O*NET-SOC Code", "Title"):
            if column in frame.columns:
                frame[column] = frame[column].astype(str).str.strip()
        frames[key] = frame
    return frames


def build_career_data(frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """One row per occupation with its software and essential skill lists."""
    occ = frames["occupation"][["O*NET-SOC Code", "Title", "Description"]].copy()

    software_grouped = (
        frames["software"]
        .groupby(["O*NET-SOC Code", "Title"])["Element Name"]
        .apply(lambda values: sorted(set(values.dropna())))
        .reset_index()
    )

    essential = frames["essential"]
    importance = essential[
        essential["Scale Name"].str.contains("Importance", case=False, na=False)
    ]
    essential_grouped = (
        importance.groupby(["O*NET-SOC Code", "Title"])["Element Name"]
        .apply(lambda values: sorted(set(values.dropna())))
        .reset_index()
    )

    career_data = occ.merge(
        software_grouped, on=["O*NET-SOC Code", "Title"], how="left"
    ).merge(
        essential_grouped,
        on=["O*NET-SOC Code", "Title"],
        how="left",
        suffixes=("_software", "_essential"),
    )
    career_data = career_data.rename(
        columns={
            "Element Name_software": "Software Skills",
            "Element Name_essential": "Essential Skills",
        }
    )

    for column in ("Software Skills", "Essential Skills"):
        career_data[column] = career_data[column].apply(
            lambda value: value if isinstance(value, list) else []
        )

    career_data["Technology Count"] = career_data["Software Skills"].apply(len)
    career_data["Essential Skill Count"] = career_data["Essential Skills"].apply(len)
    return career_data


def build_software_meta(frames: dict[str, pd.DataFrame]) -> dict[str, dict]:
    """Hot/in-demand flags and concrete product examples per software category.

    The model only knows the 134 O*NET software *categories*, which are too
    abstract to show a learner on their own. The workplace examples turn
    "Web platform development software" into "React, Django, Node.js".
    """
    software = frames["software"]
    meta: dict[str, dict] = {}
    for name, group in software.groupby("Element Name"):
        examples = (
            group["Workplace Example"].dropna().astype(str).str.strip().value_counts()
        )
        meta[str(name)] = {
            "hot": bool((group["Hot Technology"] == "Y").any()),
            "in_demand": bool((group["In Demand"] == "Y").any()),
            "examples": list(examples.index[:6]),
            "career_count": int(group["O*NET-SOC Code"].nunique()),
        }
    return meta


def build_interest_meta(frames: dict[str, pd.DataFrame]) -> dict[str, list[str]]:
    """RIASEC interest themes per occupation, used to enrich career detail."""
    interest = frames["interest"]
    riasec = {
        "Realistic",
        "Investigative",
        "Artistic",
        "Social",
        "Enterprising",
        "Conventional",
    }
    rows = interest[
        interest["Element Name"].isin(riasec)
        & interest["Scale Name"].str.contains("Occupational Interest", case=False, na=False)
    ]
    if rows.empty:
        rows = interest[interest["Element Name"].isin(riasec)]

    meta: dict[str, list[str]] = {}
    for code, group in rows.groupby("O*NET-SOC Code"):
        top = group.sort_values("Data Value", ascending=False)["Element Name"]
        meta[str(code)] = list(dict.fromkeys(top))[:3]
    return meta


def make_students(
    career_data: pd.DataFrame,
    per_career: int = PER_CAREER,
    keep_ratio: float = KEEP_RATIO,
    seed: int = SEED,
) -> pd.DataFrame:
    """Synthetic learners: each keeps a random ~70% subset of a career's skills."""
    rng = np.random.default_rng(seed)
    profiles = []
    for index, row in career_data.iterrows():
        software = row["Software Skills"]
        essential = row["Essential Skills"]
        for student_id in range(per_career):
            profiles.append(
                {
                    "Student_ID": f"S{index}_{student_id}",
                    "Career": row["Title"],
                    "O*NET-SOC Code": row["O*NET-SOC Code"],
                    "Software Skills": _sample(software, keep_ratio, rng),
                    "Essential Skills": _sample(essential, keep_ratio, rng),
                }
            )
    return pd.DataFrame(profiles)


def _sample(skills: list[str], keep_ratio: float, rng: np.random.Generator) -> list[str]:
    if not skills:
        return []
    kept = [skill for skill in skills if rng.random() < keep_ratio]
    # A profile with nothing in it carries no signal and only adds an all-zero
    # row that every sparse query then matches.
    return kept or [skills[int(rng.integers(len(skills)))]]


def skill_vocabulary(career_data: pd.DataFrame) -> tuple[list[str], list[str]]:
    software = sorted({s for skills in career_data["Software Skills"] for s in skills})
    essential = sorted({s for skills in career_data["Essential Skills"] for s in skills})
    return software, essential
