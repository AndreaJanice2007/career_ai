"""Trains the career recommender and writes a single artifact for the API to load.

Run once from the project root:

    python backend/train.py

Use --quick to skip the slower comparison models (only the served
LogisticRegression is trained).
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import pipeline  # noqa: E402

from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.linear_model import LinearRegression, LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split  # noqa: E402
from sklearn.naive_bayes import BernoulliNB  # noqa: E402
from sklearn.neighbors import KNeighborsClassifier  # noqa: E402
from sklearn.preprocessing import MultiLabelBinarizer  # noqa: E402
from sklearn.svm import LinearSVC  # noqa: E402
from sklearn.tree import DecisionTreeClassifier  # noqa: E402

ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "model.joblib"


def log(message: str) -> None:
    print(f"[train] {message}", flush=True)


def build_dataset(career_data: pd.DataFrame):
    """Binary skill matrix for the synthetic learners, plus the fitted binarizers.

    The binarizers are fitted on the full career vocabulary rather than on the
    sampled student skills, so every skill the UI can offer has a column and
    nothing is silently dropped at prediction time.
    """
    software_vocab, essential_vocab = pipeline.skill_vocabulary(career_data)

    mlb_software = MultiLabelBinarizer(classes=software_vocab)
    mlb_essential = MultiLabelBinarizer(classes=essential_vocab)
    mlb_software.fit([software_vocab])
    mlb_essential.fit([essential_vocab])

    students = pipeline.make_students(career_data)
    log(f"synthetic students: {len(students)}")

    x_software = mlb_software.transform(students["Software Skills"])
    x_essential = mlb_essential.transform(students["Essential Skills"])
    features = np.hstack([x_software, x_essential]).astype(np.float64)
    labels = students["Career"].to_numpy()

    feature_names = list(software_vocab) + list(essential_vocab)
    return features, labels, feature_names, mlb_software, mlb_essential


def score_model(name: str, model, x_train, y_train, x_test, y_test) -> dict:
    started = time.perf_counter()
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    elapsed = time.perf_counter() - started
    metrics = {
        "model": name,
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(
            precision_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "recall": float(
            recall_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "f1": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
        "seconds": round(elapsed, 2),
    }
    log(f"{name}: accuracy={metrics['accuracy']:.4f} ({elapsed:.1f}s)")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the career recommender.")
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Train only the served model and skip the comparison table.",
    )
    args = parser.parse_args()

    started = time.perf_counter()
    log("loading O*NET CSVs")
    frames = pipeline.load_raw()

    career_data = pipeline.build_career_data(frames)
    log(f"careers in catalog: {len(career_data)}")

    # Careers with no recorded skills produce all-zero rows that any sparse
    # query matches equally well, so they are excluded from training while
    # remaining browsable through the API.
    trainable = career_data[
        (career_data["Technology Count"] > 0)
        | (career_data["Essential Skill Count"] > 0)
    ].reset_index(drop=True)
    log(f"careers used for training: {len(trainable)}")

    features, labels, feature_names, mlb_software, mlb_essential = build_dataset(
        trainable
    )
    log(f"feature matrix: {features.shape}, classes: {len(set(labels))}")

    x_train, x_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.2, random_state=42, stratify=labels
    )

    log("training LogisticRegression (served model)")
    served = LogisticRegression(max_iter=2000, solver="lbfgs", n_jobs=-1)
    metrics = [score_model("Logistic Regression", served, x_train, y_train, x_test, y_test)]

    if not args.quick:
        comparisons = [
            ("SVM (LinearSVC)", LinearSVC(max_iter=5000, random_state=42)),
            (
                "Random Forest",
                RandomForestClassifier(
                    n_estimators=100, max_depth=30, random_state=42, n_jobs=-1
                ),
            ),
            ("Bernoulli Naive Bayes", BernoulliNB()),
            ("K-Nearest Neighbors", KNeighborsClassifier(n_neighbors=5, n_jobs=-1)),
            ("Decision Tree", DecisionTreeClassifier(max_depth=30, random_state=42)),
        ]
        for name, model in comparisons:
            metrics.append(score_model(name, model, x_train, y_train, x_test, y_test))

    metrics.sort(key=lambda row: row["accuracy"], reverse=True)

    # Sanity check from the notebook: readiness is a linear function of the
    # feature counts, so a perfect R-squared is expected here.
    readiness = features.sum(axis=1) / features.shape[1] * 100
    xr_train, xr_test, yr_train, yr_test = train_test_split(
        features, readiness, test_size=0.2, random_state=42
    )
    readiness_r2 = float(LinearRegression().fit(xr_train, yr_train).score(xr_test, yr_test))

    software_meta = pipeline.build_software_meta(frames)
    interest_meta = pipeline.build_interest_meta(frames)

    careers = [
        {
            "code": row["O*NET-SOC Code"],
            "title": row["Title"],
            "description": row["Description"],
            "software": list(row["Software Skills"]),
            "essential": list(row["Essential Skills"]),
            "interests": interest_meta.get(row["O*NET-SOC Code"], []),
            "trainable": bool(
                row["Technology Count"] > 0 or row["Essential Skill Count"] > 0
            ),
        }
        for _, row in career_data.iterrows()
    ]

    artifact = {
        "model": served,
        "mlb_software": mlb_software,
        "mlb_essential": mlb_essential,
        "feature_names": feature_names,
        "software_skills": list(mlb_software.classes_),
        "essential_skills": list(mlb_essential.classes_),
        "software_meta": software_meta,
        "careers": careers,
        "metrics": metrics,
        "readiness_r2": readiness_r2,
        "stats": {
            "careers_total": len(career_data),
            "careers_trained": len(trainable),
            "students": int(features.shape[0]),
            "features": int(features.shape[1]),
            "train_rows": int(x_train.shape[0]),
            "test_rows": int(x_test.shape[0]),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, ARTIFACT_PATH, compress=3)
    size_mb = ARTIFACT_PATH.stat().st_size / 1_048_576
    log(f"wrote {ARTIFACT_PATH} ({size_mb:.1f} MB)")
    log(f"done in {time.perf_counter() - started:.1f}s")


if __name__ == "__main__":
    main()
