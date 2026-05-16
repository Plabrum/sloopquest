"""Tests for the CRUD controller factory and list endpoint pattern."""

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import cast

import pytest
import sqlalchemy as sa
from litestar import Controller, Litestar
from litestar.di import Provide
from litestar.testing import AsyncTestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.users.models import User
from app.domain.users.roles import Role
from app.platform.actions.registry import ActionRegistry
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.crud import CRUDConfig, _crud_metadata, make_crud_controller
from app.platform.base.filters import TextFilter, apply_filter
from app.platform.base.models import BaseDBModel
from app.platform.base.schema_routes import schema_router
from app.platform.base.search import SearchMixin
from app.utils.sqids import Sqid


class _Vessel(SearchMixin):
    __tablename__ = "test_vessels"

    organization_id: Mapped[int] = mapped_column(nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    name: Mapped[str] = mapped_column(sa.String, nullable=False)

    # No trgm/fts columns: SearchMixin emits no `search_vector` column (sqlite has
    # no `to_tsvector`), and `search_filter` is a no-op. FTS coverage lives in
    # tests/test_search.py against Postgres.


class VesselListItem(ActionableList):
    id: int
    name: str


class VesselDetail(ActionableDetail):
    id: int
    name: str


def _to_list(v: _Vessel, _user: User) -> VesselListItem:
    return VesselListItem(id=v.id, name=v.name)


def _to_detail(v: _Vessel, _user: User) -> VesselDetail:
    return VesselDetail(id=v.id, name=v.name)


def _make_stub_user() -> User:
    user = User(name="stub", email="stub@example.test", organization_id=42, role=Role.ADMIN)
    user.id = Sqid(1)
    return user


CONFIG = CRUDConfig(
    model=_Vessel,
    to_list_item=_to_list,
    to_detail=_to_detail,
    filterable_columns={"name"},
    sortable_columns={"name", "created_at"},
    column_types={"name": "string"},
    column_labels={"name": "Vessel name"},
)


@pytest.fixture
async def session_factory() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(
            BaseDBModel.metadata.create_all,
            tables=[cast("sa.Table", _Vessel.__table__)],
        )
    sm = async_sessionmaker(engine, expire_on_commit=False)
    async with sm() as s:
        s.add_all(
            [
                _Vessel(organization_id=42, name="Sloopquest"),
                _Vessel(organization_id=42, name="Mariner"),
                _Vessel(organization_id=42, name="Other Org Boat"),
                _Vessel(organization_id=99, name="Outsider"),  # different org
                _Vessel(organization_id=42, name="Deleted", deleted_at=datetime.now()),
            ]
        )
        await s.commit()
    yield sm
    await engine.dispose()


def test_make_crud_controller_returns_controller():
    ctl = make_crud_controller("/vessels", CONFIG)
    assert issubclass(ctl, Controller)
    assert ctl.path == "/vessels"
    assert hasattr(ctl, "list_handler")
    assert hasattr(ctl, "detail_handler")


def test_crud_metadata_registered():
    make_crud_controller("/vessels", CONFIG)
    meta = _crud_metadata["list__Vessel"]
    assert meta["filterable"] == ["name"]
    assert "name" in meta["sortable"]
    assert meta["column_types"] == {"name": "string"}
    assert meta["column_labels"] == {"name": "Vessel name"}


def test_expose_detail_false_omits_detail_handler():
    cfg = CRUDConfig(
        model=_Vessel,
        to_list_item=_to_list,
        to_detail=_to_detail,
        expose_detail=False,
    )
    ctl = make_crud_controller("/vessels-list-only", cfg)
    assert hasattr(ctl, "list_handler")
    assert "detail_handler" not in ctl.__dict__


async def test_apply_filter_text_contains(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as s:
        q = sa.select(_Vessel).where(_Vessel.organization_id == 42, _Vessel.deleted_at.is_(None))
        q = apply_filter(q, _Vessel, TextFilter(column="name", operation="contains", value="loop"), {"name"})
        rows = (await s.execute(q)).scalars().all()
        names = {r.name for r in rows}
        assert names == {"Sloopquest"}


async def test_apply_filter_skips_disallowed_column(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as s:
        q = sa.select(_Vessel).where(_Vessel.organization_id == 42)
        # "name" not in allowed_columns -> filter is silently skipped
        q = apply_filter(q, _Vessel, TextFilter(column="name", operation="equals", value="Sloopquest"), set())
        rows = (await s.execute(q)).scalars().all()
        assert len(rows) >= 3


class _AuthMiddleware:
    """Sets scope['user'] so requires_session passes — minimal stand-in for real auth."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            scope["user"] = _make_stub_user()
        await self.app(scope, receive, send)


def _build_app(session_factory: async_sessionmaker[AsyncSession], extra_routes: list = []) -> Litestar:
    ctl = make_crud_controller("/vessels", CONFIG)

    async def provide_transaction() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as s:
            yield s

    async def provide_user() -> User:
        return _make_stub_user()

    async def provide_action_registry() -> ActionRegistry:
        return ActionRegistry()

    async def provide_action_deps() -> None:
        # CRUD requests it as a dep, but _Vessel has no registered action
        # group, so the handler never actually reads it.
        return None

    return Litestar(
        route_handlers=[ctl, *extra_routes],
        dependencies={
            "transaction": Provide(provide_transaction),
            "user": Provide(provide_user),
            "action_registry": Provide(provide_action_registry),
            "action_deps": Provide(provide_action_deps),
        },
        middleware=[_AuthMiddleware],
        debug=True,
    )


async def test_list_endpoint_empty_body_returns_paged_response(
    session_factory: async_sessionmaker[AsyncSession],
):
    app = _build_app(session_factory)
    async with AsyncTestClient(app=app) as client:
        resp = await client.post("/vessels", json={})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["offset"] == 0
        assert body["limit"] == 50
        # Org 42 has 3 non-deleted rows
        assert body["total"] == 3
        assert len(body["items"]) == 3
        assert body["has_more"] is False
        names = {item["name"] for item in body["items"]}
        assert names == {"Sloopquest", "Mariner", "Other Org Boat"}


async def test_list_endpoint_text_filter_returns_matching_rows(
    session_factory: async_sessionmaker[AsyncSession],
):
    app = _build_app(session_factory)
    async with AsyncTestClient(app=app) as client:
        resp = await client.post(
            "/vessels",
            json={
                "filters": [
                    {"type": "text", "column": "name", "operation": "contains", "value": "loop"},
                ]
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["total"] == 1
        assert [i["name"] for i in body["items"]] == ["Sloopquest"]


async def test_schema_crud_metadata_endpoint_returns_metadata():
    make_crud_controller("/vessels", CONFIG)

    app = Litestar(route_handlers=[schema_router], debug=True)
    async with AsyncTestClient(app=app) as client:
        resp = await client.get("/schema/crud-metadata")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "list__Vessel" in body
        assert body["list__Vessel"]["filterable"] == ["name"]
