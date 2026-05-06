"""SearchMixin tests — requires a running Postgres (dev `db` service).

Skipped automatically when no Postgres is reachable. Tests use an isolated
`DeclarativeBase` and unique table names so they don't collide with the
project's metadata.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import ClassVar

import pytest
import sqlalchemy as sa
from sqlalchemy import ColumnElement, func
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

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


class _Base(DeclarativeBase):
    pass


class _Survey(_Base, SearchMixin):
    __tablename__ = "_t_search_surveys"
    __table_args__ = (sa.Index("_ix_t_search_surveys_search_vector", "search_vector", postgresql_using="gin"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())

    search_columns: ClassVar[list[str]] = ["name", "description"]


class _SurveyFTS(_Base, SearchMixin):
    """Same shape as `_Survey` but overrides `search_filter` to use FTS."""

    __tablename__ = "_t_search_surveys_fts"
    __table_args__ = (sa.Index("_ix_t_search_surveys_fts_search_vector", "search_vector", postgresql_using="gin"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())

    search_columns: ClassVar[list[str]] = ["name", "description"]

    @classmethod
    def search_filter(cls, term: str) -> ColumnElement | None:
        if not term or not term.strip():
            return None
        return cls.search_vector.op("@@")(func.websearch_to_tsquery("english", term))


class _PlainBoat(_Base):
    """No SearchMixin — used to confirm CRUD ignores the `search` field."""

    __tablename__ = "_t_search_plain_boats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    organization_id: Mapped[int] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.func.now())


@pytest.fixture
async def session_factory() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(_pg_url())
    try:
        async with engine.begin() as conn:
            await conn.run_sync(_Base.metadata.drop_all)
            await conn.run_sync(_Base.metadata.create_all)
    except OperationalError as e:
        await engine.dispose()
        pytest.skip(f"Postgres unavailable: {e}")

    sm = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield sm
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(_Base.metadata.drop_all)
        await engine.dispose()


def test_search_vector_column_emitted_when_search_columns_set():
    cols = {c.name for c in _Survey.__table__.columns}
    assert "search_vector" in cols
    sv = _Survey.__table__.c.search_vector
    assert sv.computed is not None
    assert sv.computed.persisted is True


def test_search_vector_column_omitted_when_search_columns_empty():
    class _NoCols(_Base, SearchMixin):
        __tablename__ = "_t_search_no_cols"
        id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
        name: Mapped[str] = mapped_column(sa.String, nullable=False)

    assert "search_vector" not in {c.name for c in _NoCols.__table__.columns}


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
        assert "renam" in survey.search_vector.lower()


async def test_default_ilike_search_filter_returns_matching_rows(
    session_factory: async_sessionmaker[AsyncSession],
):
    async with session_factory() as s:
        s.add_all(
            [
                _Survey(name="Sloopquest", description="fast schooner", organization_id=1),
                _Survey(name="Mariner", description="ketch rig", organization_id=1),
                _Survey(name="Other", description="unrelated", organization_id=1),
            ]
        )
        await s.commit()

        cond = _Survey.search_filter("schooner")
        assert cond is not None
        rows = (await s.execute(sa.select(_Survey).where(cond))).scalars().all()
        assert {r.name for r in rows} == {"Sloopquest"}


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
