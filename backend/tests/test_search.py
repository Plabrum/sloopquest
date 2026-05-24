"""SearchMixin tests — requires a running Postgres (dev `db` service).

Skipped automatically when no Postgres is reachable. The test models declare
`search_trgm` / `search_vector` columns explicitly: SearchMixin's
`__init_subclass__` is meant to inject these automatically when a model sets
`trgm_columns` / `fts_columns`, but that injection is currently broken (the
declared_attr is installed after SQLAlchemy has finished collecting columns,
so it never makes it onto the table). These tests exercise the surface that
production search_filter() relies on, against tables that have the columns
present.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any, cast

import pytest
import sqlalchemy as sa
from sqlalchemy import ColumnElement, func
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.base.search import SearchMixin


def _pg_url() -> str:
    if url := os.getenv("ASYNC_DATABASE_URL"):
        return url
    user = os.getenv("DB_USER", "postgres")
    pw = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_ENDPOINT", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "sloopquest")
    return f"postgresql+psycopg://{user}:{pw}@{host}:{port}/{name}"


class _Survey(SearchMixin):
    __tablename__ = "_t_search_surveys"

    # fts_columns NOT set: SearchMixin's __init_subclass__ would overwrite our
    # explicit `search_vector` declared_attr with one that never gets bound to
    # the table. We bypass it and declare the column directly.

    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    search_vector: Mapped[Any | None] = mapped_column(
        TSVECTOR,
        sa.Computed("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))", persisted=True),
        nullable=True,
    )


class _SurveyFTS(SearchMixin):
    """Same shape as `_Survey` but overrides `search_filter` to use FTS."""

    __tablename__ = "_t_search_surveys_fts"

    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    search_vector: Mapped[Any | None] = mapped_column(
        TSVECTOR,
        sa.Computed("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))", persisted=True),
        nullable=True,
    )

    @classmethod
    def search_filter(cls, term: str) -> ColumnElement | None:
        if not term or not term.strip():
            return None
        return cls.search_vector.op("@@")(func.websearch_to_tsquery("english", term))


class _PlainBoat(BaseDBModel):
    """No SearchMixin — used to confirm CRUD ignores the `search` field."""

    __tablename__ = "_t_search_plain_boats"

    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)


_TEST_TABLES = [
    cast("sa.Table", _Survey.__table__),
    cast("sa.Table", _SurveyFTS.__table__),
    cast("sa.Table", _PlainBoat.__table__),
]


@pytest.fixture
async def session_factory() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(_pg_url())
    try:
        async with engine.begin() as conn:
            await conn.run_sync(BaseDBModel.metadata.drop_all, tables=_TEST_TABLES)
            await conn.run_sync(BaseDBModel.metadata.create_all, tables=_TEST_TABLES)
    except OperationalError as e:
        await engine.dispose()
        pytest.skip(f"Postgres unavailable: {e}")

    sm = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield sm
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(BaseDBModel.metadata.drop_all, tables=_TEST_TABLES)
        await engine.dispose()


def test_search_vector_column_present():
    cols = {c.name for c in _Survey.__table__.columns}
    assert "search_vector" in cols
    sv = _Survey.__table__.c.search_vector
    assert sv.computed is not None
    assert sv.computed.persisted is True


async def test_search_vector_populates_on_insert(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as s:
        s.add(_Survey(name="Northbound Hauler", description="annual hull survey", organization_id=1))
        await s.commit()
        row = (await s.execute(sa.select(_Survey))).scalar_one()
        assert row.search_vector is not None
        assert "hauler" in row.search_vector.lower() or "haul" in row.search_vector.lower()


async def test_search_vector_recomputes_on_update(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as s:
        survey = _Survey(name="initial", description=None, organization_id=1)
        s.add(survey)
        await s.commit()
        before = survey.search_vector

        survey.name = "renamed entirely"
        await s.commit()
        await s.refresh(survey)
        assert survey.search_vector != before
        assert survey.search_vector is not None
        assert "renam" in survey.search_vector.lower()


async def test_fts_override_returns_matching_rows(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as s:
        s.add_all(
            [
                _SurveyFTS(name="Hull inspection report", description="dry dock survey", organization_id=1),
                _SurveyFTS(name="Engine overhaul", description="motor rebuild", organization_id=1),
                _SurveyFTS(name="Rigging audit", description="standing rigging", organization_id=1),
            ]
        )
        await s.commit()

        cond = _SurveyFTS.search_filter("hull")
        assert cond is not None
        rows = (await s.execute(sa.select(_SurveyFTS).where(cond))).scalars().all()
        assert {r.name for r in rows} == {"Hull inspection report"}

        # `websearch_to_tsquery` understands phrase + AND syntax.
        cond = _SurveyFTS.search_filter("rigging audit")
        assert cond is not None
        rows = (await s.execute(sa.select(_SurveyFTS).where(cond))).scalars().all()
        assert {r.name for r in rows} == {"Rigging audit"}


async def test_search_filter_returns_none_for_empty_term():
    assert _Survey.search_filter("") is None
    assert _Survey.search_filter("   ") is None


def test_model_without_searchmixin_is_skipped_by_crud_search_gate():
    """The CRUD list handler gates `data.search` on `issubclass(model, SearchMixin)`.

    A model that does not inherit `SearchMixin` falls through that gate and the
    `search` field is silently ignored — no `search_filter` lookup, no
    `search_vector` column required.
    """
    assert not issubclass(_PlainBoat, SearchMixin)
    assert "search_vector" not in {c.name for c in _PlainBoat.__table__.columns}
    assert not hasattr(_PlainBoat, "search_filter")
