"""SearchMixin for models that support text search across columns.

Declaring `search_columns` on a model auto-generates a persisted `search_vector`
`tsvector` column wired to those columns via Postgres `GENERATED ALWAYS AS
... STORED`. Postgres recomputes the value on every INSERT/UPDATE — no triggers,
no application-level bookkeeping.

The default `search_filter()` returns an `ilike` OR-chain so the CRUD list
handler works from day one. When a model's dataset grows large enough to need
true full-text search, override `search_filter()` to use `search_vector` with
`websearch_to_tsquery`. The mixin interface stays unchanged.
"""

from __future__ import annotations

from typing import ClassVar

import sqlalchemy as sa
from sqlalchemy import ColumnElement, or_
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import declared_attr


class SearchMixin:
    """Mixin for BaseDBModel subclasses that opt into text search.

    Usage:
        class Survey(BaseDBModel, SearchMixin):
            search_columns = ["name", "description", "reference_number"]
    """

    search_columns: ClassVar[list[str]] = []

    @declared_attr  # pyright: ignore[reportArgumentType]
    def search_vector(cls):  # noqa: N805 — declared_attr convention uses `cls`
        if not cls.search_columns:
            return None
        expression = " || ' ' || ".join(f"coalesce({col}, '')" for col in cls.search_columns)
        return sa.Column(
            TSVECTOR,
            sa.Computed(f"to_tsvector('english', {expression})", persisted=True),
            nullable=True,
        )

    @classmethod
    def search_filter(cls, term: str) -> ColumnElement | None:
        if not term or not term.strip():
            return None
        conditions = [getattr(cls, col).ilike(f"%{term}%") for col in cls.search_columns if hasattr(cls, col)]
        return or_(*conditions) if conditions else None
