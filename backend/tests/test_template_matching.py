"""Unit tests for the template-matcher subset algorithm.

Embedding narrowing is not exercised here — the matcher is fed candidates
directly so we test only the structural fit + scoring rules.
"""

from __future__ import annotations

from app.domain.surveys.models import SurveyTemplate
from app.domain.surveys.template_matching import (
    ExtractedSection,
    ExtractedTemplate,
    _levenshtein,
    _normalize,
    _score_candidate,
)


def _template(sections: list[str]) -> SurveyTemplate:
    return SurveyTemplate(
        organization_id=1,
        name="t",
        tags=[],
        definition={"sections": [{"id": f"s{i}", "title": t} for i, t in enumerate(sections)]},
    )


def _extracted(name: str, sections: list[str]) -> ExtractedTemplate:
    return ExtractedTemplate(name=name, sections=[ExtractedSection(name=s) for s in sections])


# ── _normalize / _levenshtein ───────────────────────────────────────────────


def test_normalize_strips_punct_and_lowercases():
    assert _normalize("Hull / Deck") == "hull  deck"
    assert _normalize("  HULL  ") == "hull"


def test_levenshtein_zero_for_equal():
    assert _levenshtein("hull", "hull", max_distance=2) == 0


def test_levenshtein_within_budget():
    assert _levenshtein("hull", "hul", max_distance=2) == 1
    assert _levenshtein("rigging", "rigging ", max_distance=2) == 1


def test_levenshtein_aborts_past_budget():
    assert _levenshtein("hull", "deck", max_distance=2) == 3


# ── _score_candidate ────────────────────────────────────────────────────────


def test_exact_subset_fits_with_unused_count():
    candidate = _template(["Hull", "Engine", "Electrical", "Plumbing"])
    extracted = _extracted("Survey", ["Hull", "Engine"])
    score = _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5)
    assert score == 2  # two unused (Electrical, Plumbing) out of 4 → 50% allowed


def test_extracted_section_missing_from_candidate_returns_none():
    candidate = _template(["Hull", "Engine"])
    extracted = _extracted("Survey", ["Hull", "Rigging"])
    assert _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5) is None


def test_fuzzy_match_handles_minor_typos():
    candidate = _template(["Hull", "Engine"])
    extracted = _extracted("Survey", ["Hul", "Engne"])  # 1- and 1-distance typos
    score = _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5)
    assert score == 0


def test_too_many_unused_sections_rejects_fit():
    candidate = _template(["Hull", "Engine", "Electrical", "Plumbing", "Rigging", "Sails"])
    extracted = _extracted("Survey", ["Hull"])  # 5/6 unused
    assert _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5) is None


def test_each_extracted_section_maps_to_distinct_candidate_section():
    # Two extracted "Hull" entries shouldn't both consume the same Hull candidate.
    candidate = _template(["Hull", "Hull Interior", "Engine"])
    extracted = _extracted("Survey", ["Hull", "Hull"])
    score = _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5)
    # "Hull" exact-matches candidate[0]; second "Hull" then fuzzy-matches "Hull Interior" (distance > 2 → no fit).
    # Therefore the candidate is not a fit.
    assert score is None


def test_candidate_with_no_sections_is_not_a_fit():
    candidate = _template([])
    extracted = _extracted("Survey", ["Hull"])
    assert _score_candidate(extracted, candidate, fuzzy_distance=2, max_unused_ratio=0.5) is None
