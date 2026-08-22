"""Compares candidate ranking strategies under realistic, sparse user input.

Real users tick a handful of skills, not the ~70% of a career's requirement list
that the synthetic training profiles hold. This samples K skills from a known
career and measures how often that career comes back in the top 1 / top 5.

Run with: python backend/eval_ranking.py
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.recommender import Recommender

r = Recommender()
classes = list(r.model.classes_)
class_index = {title: i for i, title in enumerate(classes)}
idf = r._idf

raw = np.zeros((len(classes), len(r.feature_names)))
for row, title in enumerate(classes):
    career = r.get_career(title)
    for skill in career["software"] + career["essential"]:
        column = r._feature_index.get(skill)
        if column is not None:
            raw[row, column] = 1.0
requirement_mass = (raw * idf).sum(axis=1)
requirement_mass[requirement_mass == 0] = 1.0

BETA = 0.25


def components(vector: np.ndarray):
    user = vector.ravel() * idf
    user_mass = user.sum() or 1.0
    matched = (raw * user).sum(axis=1)
    precision = matched / user_mass
    recall = matched / requirement_mass
    denominator = BETA**2 * precision + recall
    denominator[denominator == 0] = 1e-9
    fit = (1 + BETA**2) * precision * recall / denominator
    probabilities = r.model.predict_proba(vector)[0]
    return fit, probabilities / (probabilities.max() or 1.0)


WEIGHTS = [0.0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5]


def evaluate(sample_size: int, trials: int = 200, seed: int = 7):
    rng = np.random.default_rng(seed)
    candidates = [t for t in classes if len(r.get_career(t)["software"]) >= sample_size]
    picks = rng.choice(len(candidates), size=min(trials, len(candidates)), replace=False)

    hits = {weight: [0, 0] for weight in WEIGHTS}
    for pick in picks:
        title = candidates[pick]
        career = r.get_career(title)
        chosen_software = list(
            rng.choice(career["software"], size=sample_size, replace=False)
        )
        chosen_essential = (
            list(
                rng.choice(
                    career["essential"],
                    size=min(3, len(career["essential"])),
                    replace=False,
                )
            )
            if career["essential"]
            else []
        )
        vector = r.vectorize(chosen_software, chosen_essential)
        fit, probabilities = components(vector)
        truth = class_index[title]
        for weight in WEIGHTS:
            scores = weight * probabilities + (1 - weight) * fit
            order = np.argsort(scores)[::-1]
            if order[0] == truth:
                hits[weight][0] += 1
            if truth in order[:5]:
                hits[weight][1] += 1
    return hits, len(picks)


for sample_size in (4, 6, 10, 20):
    hits, total = evaluate(sample_size)
    print(f"\n=== {sample_size} software skills selected ({total} careers) ===")
    for weight, (top1, top5) in hits.items():
        print(
            f"  model weight {weight:<5}  top1={top1/total:6.1%}  top5={top5/total:6.1%}"
        )
