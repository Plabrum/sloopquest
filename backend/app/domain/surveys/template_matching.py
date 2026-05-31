"""Template matching: find an existing SurveyTemplate that fits an extracted survey.

Algorithm:
  1. Narrow candidates via embedding similarity (RLS-scoped, configurable k).
  2. For each candidate, normalize section names and check whether every
     extracted section maps to one in the candidate (fuzzy by Levenshtein
     distance ≤ TEMPLATE_FUZZY_DISTANCE).
  3. Score fits by `len(candidate.sections) - len(matched)` (tighter = lower).
     Reject fits where the unused-section ratio exceeds TEMPLATE_MAX_UNUSED_RATIO.
  4. Pick the lowest-score fit; otherwise return None.

We never update an existing template based on the extracted survey, and we
never merge templates as a side effect. See the doc for rationale.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.surveys.models import SurveyTemplate
from app.platform.embeddings.query import nearest


@dataclass(frozen=True)
class ExtractedSection:
    name: str


@dataclass(frozen=True)
class ExtractedTemplate:
    name: str
    sections: list[ExtractedSection]

    def embed_text(self) -> str:
        return "\n".join([self.name, *(s.name for s in self.sections)])


def _normalize(name: str) -> str:
    return "".join(c.lower() for c in name if c.isalnum() or c.isspace()).strip()


def _levenshtein(a: str, b: str, *, max_distance: int) -> int:
    """Bounded Levenshtein distance — returns `max_distance + 1` on early-exit.

    We never need an exact distance beyond the threshold, so we abort the row
    scan once every cell on the current row exceeds the budget.
    """
    if a == b:
        return 0
    if abs(len(a) - len(b)) > max_distance:
        return max_distance + 1
    if not a:
        return len(b)
    if not b:
        return len(a)

    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        curr = [i] + [0] * len(b)
        row_min = curr[0]
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            curr[j] = min(
                prev[j] + 1,  # deletion
                curr[j - 1] + 1,  # insertion
                prev[j - 1] + cost,  # substitution
            )
            row_min = min(row_min, curr[j])
        if row_min > max_distance:
            return max_distance + 1
        prev = curr
    return prev[-1]


def _candidate_section_titles(template: SurveyTemplate) -> list[str]:
    sections = (template.definition or {}).get("sections") or []
    titles: list[str] = []
    for s in sections:
        if isinstance(s, dict):
            title = s.get("title")
            if title:
                titles.append(str(title))
    return titles


def _score_candidate(
    extracted: ExtractedTemplate,
    candidate: SurveyTemplate,
    *,
    fuzzy_distance: int,
    max_unused_ratio: float,
) -> int | None:
    """Returns a fit score (lower = tighter), or None if the candidate doesn't fit."""
    candidate_titles = _candidate_section_titles(candidate)
    if not candidate_titles:
        return None

    normalized_candidates = [_normalize(t) for t in candidate_titles]
    matched_indices: set[int] = set()

    for extracted_section in extracted.sections:
        target = _normalize(extracted_section.name)
        best_idx: int | None = None
        best_distance = fuzzy_distance + 1
        for idx, cand in enumerate(normalized_candidates):
            if idx in matched_indices:
                continue
            d = _levenshtein(target, cand, max_distance=fuzzy_distance)
            if d < best_distance:
                best_distance = d
                best_idx = idx
                if d == 0:
                    break
        if best_idx is None:
            # Every extracted section must map to a candidate section.
            return None
        matched_indices.add(best_idx)

    unused = len(normalized_candidates) - len(matched_indices)
    if unused / len(normalized_candidates) > max_unused_ratio:
        return None
    return unused


async def find_matching_template(
    transaction: AsyncSession,
    extracted: ExtractedTemplate,
) -> SurveyTemplate | None:
    if not extracted.sections:
        return None

    candidates = await nearest(
        transaction,
        SurveyTemplate,
        extracted.embed_text(),
        limit=config.TEMPLATE_EMBEDDING_K,
    )

    scored: list[tuple[int, SurveyTemplate]] = []
    for candidate, _similarity in candidates:
        score = _score_candidate(
            extracted,
            candidate,
            fuzzy_distance=config.TEMPLATE_FUZZY_DISTANCE,
            max_unused_ratio=config.TEMPLATE_MAX_UNUSED_RATIO,
        )
        if score is not None:
            scored.append((score, candidate))

    if not scored:
        return None
    scored.sort(key=lambda pair: pair[0])
    return scored[0][1]
