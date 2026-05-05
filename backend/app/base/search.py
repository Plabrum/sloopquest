"""SearchMixin for models that support text search across columns."""

from __future__ import annotations

from typing import ClassVar

from sqlalchemy import ColumnElement, or_


class SearchMixin:
    """Mixin for BaseDBModel subclasses that opt into text search.

    Usage:
        class Patient(BaseDBModel, SearchMixin):
            search_columns = ["name", "notes"]
    """

    search_columns: ClassVar[list[str]] = []

    @classmethod
    def search_filter(cls, term: str) -> ColumnElement | None:
        if not term or not term.strip():
            return None
        conditions = [getattr(cls, col).ilike(f"%{term}%") for col in cls.search_columns if hasattr(cls, col)]
        return or_(*conditions) if conditions else None
