"""CRUD route tests for /calendar-events."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from litestar.testing import AsyncTestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.calendar_events.enums import CalendarEventState
from tests.factories.calendar_events import CalendarEventFactory


@pytest.fixture
async def events(db_session: AsyncSession, user):
    base = datetime.now(tz=UTC).replace(microsecond=0)
    e1 = await CalendarEventFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        start=base,
        end=base + timedelta(hours=1),
        state=CalendarEventState.tentative,
        name="Marina A kickoff",
    )
    e2 = await CalendarEventFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        start=base + timedelta(days=1),
        end=base + timedelta(days=1, hours=2),
        state=CalendarEventState.confirmed,
        name="Marina B kickoff",
    )
    e3 = await CalendarEventFactory.create_async(
        session=db_session,
        organization_id=user.organization_id,
        start=base + timedelta(days=2),
        end=base + timedelta(days=2, hours=1),
        state=CalendarEventState.confirmed,
        name="Marina C kickoff",
    )
    await db_session.flush()
    return e1, e2, e3


async def test_list_returns_org_events(authenticated_client: AsyncTestClient, events) -> None:
    resp = await authenticated_client.post("/calendar-events", json={})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3


async def test_list_filter_by_state(authenticated_client: AsyncTestClient, events) -> None:
    resp = await authenticated_client.post(
        "/calendar-events",
        json={"filters": [{"type": "enum", "column": "state", "values": ["confirmed"]}]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert all(item["state"] == "confirmed" for item in body["items"])


async def test_list_pagination(authenticated_client: AsyncTestClient, events) -> None:
    resp = await authenticated_client.post("/calendar-events", json={"limit": 2, "offset": 0})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["has_more"] is True


async def test_detail_returns_event(authenticated_client: AsyncTestClient, events) -> None:
    e1, *_ = events
    resp = await authenticated_client.get(f"/calendar-events/{e1.id}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(e1.id)
    assert body["name"] == "Marina A kickoff"
    assert body["address"] is None
