"""Action tests for CalendarEvent."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
from litestar.exceptions import ValidationException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.addresses.models import Address
from app.domain.calendar_events.actions import (
    CancelCalendarEvent,
    CompleteCalendarEvent,
    ConfirmCalendarEvent,
    CreateCalendarEvent,
    DeleteCalendarEvent,
    UpdateCalendarEvent,
)
from app.domain.calendar_events.enums import CalendarEventState
from app.domain.calendar_events.models import CalendarEvent
from app.domain.calendar_events.schemas import (
    AddressInput,
    CreateCalendarEventData,
    UpdateCalendarEventData,
)
from app.platform.actions.base import EmptyActionData
from app.platform.actions.deps import ActionDeps
from app.platform.state_machine.exceptions import InvalidTransitionError
from app.platform.state_machine.machine import StateMachineService
from app.platform.state_machine.models import StateTransitionLog
from tests.factories.calendar_events import CalendarEventFactory


def _make_deps(transaction: AsyncSession, user) -> ActionDeps:
    return ActionDeps(
        user=user,
        organization=MagicMock(id=user.organization_id),
        request=MagicMock(),
        transaction=transaction,
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=StateMachineService(transaction),
        billing=MagicMock(),
        email=MagicMock(),
    )


def _base_window() -> tuple[datetime, datetime]:
    start = datetime.now(tz=UTC).replace(microsecond=0)
    return start, start + timedelta(hours=1)


async def test_create_happy_path(db_session: AsyncSession, user) -> None:
    deps = _make_deps(db_session, user)
    start, end = _base_window()
    data = CreateCalendarEventData(start=start, end=end, name="Survey kickoff")

    response = await CreateCalendarEvent.execute(data, db_session, deps)

    assert response.created_id is not None
    event = (
        await db_session.execute(select(CalendarEvent).where(CalendarEvent.id == response.created_id))
    ).scalar_one()
    assert event.state == CalendarEventState.tentative
    assert event.name == "Survey kickoff"


async def test_create_all_day_snaps_to_day_boundaries(db_session: AsyncSession, user) -> None:
    deps = _make_deps(db_session, user)
    start = datetime(2026, 5, 13, 14, 30, tzinfo=UTC)
    end = datetime(2026, 5, 13, 18, 0, tzinfo=UTC)
    data = CreateCalendarEventData(start=start, end=end, all_day=True)

    response = await CreateCalendarEvent.execute(data, db_session, deps)

    event = (
        await db_session.execute(select(CalendarEvent).where(CalendarEvent.id == response.created_id))
    ).scalar_one()
    assert event.start == datetime(2026, 5, 13, 0, 0, tzinfo=UTC)
    assert event.end == datetime(2026, 5, 14, 0, 0, tzinfo=UTC)


async def test_create_rejects_end_le_start(db_session: AsyncSession, user) -> None:
    deps = _make_deps(db_session, user)
    start = datetime.now(tz=UTC)
    data = CreateCalendarEventData(start=start, end=start)

    with pytest.raises(ValidationException):
        await CreateCalendarEvent.execute(data, db_session, deps)


async def test_update_happy_path(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    await db_session.refresh(event, attribute_names=["address"])
    deps = _make_deps(db_session, user)

    new_start = datetime(2026, 6, 1, 9, 0, tzinfo=UTC)
    new_end = new_start + timedelta(hours=2)
    data = UpdateCalendarEventData(
        start=new_start,
        end=new_end,
        all_day=False,
        name="Hauled survey",
        address=None,
        description="updated",
        attendees=["a@b.com"],
        survey_id=None,
        client_id=None,
    )

    await UpdateCalendarEvent.execute(event, data, db_session, deps)

    assert event.start == new_start
    assert event.end == new_end
    assert event.name == "Hauled survey"
    assert event.description == "updated"
    assert event.attendees == ["a@b.com"]


async def test_update_rejects_end_le_start(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(session=db_session, organization_id=user.organization_id)
    await db_session.flush()
    await db_session.refresh(event, attribute_names=["address"])
    deps = _make_deps(db_session, user)
    start = datetime.now(tz=UTC)
    data = UpdateCalendarEventData(
        start=start,
        end=start,
        all_day=False,
        name=None,
        address=None,
        description=None,
        attendees=[],
        survey_id=None,
        client_id=None,
    )
    with pytest.raises(ValidationException):
        await UpdateCalendarEvent.execute(event, data, db_session, deps)


async def test_create_with_address(db_session: AsyncSession, user) -> None:
    deps = _make_deps(db_session, user)
    start, end = _base_window()
    data = CreateCalendarEventData(
        start=start,
        end=end,
        name="Sea trial",
        address=AddressInput(
            line1="1 Wharf St",
            line2=None,
            city="Newport",
            region="RI",
            postal_code="02840",
            country="US",
        ),
    )

    response = await CreateCalendarEvent.execute(data, db_session, deps)
    event = (
        await db_session.execute(select(CalendarEvent).where(CalendarEvent.id == response.created_id))
    ).scalar_one()
    assert event.address_id is not None
    address = (await db_session.execute(select(Address).where(Address.id == event.address_id))).scalar_one()
    assert address.line1 == "1 Wharf St"
    assert address.city == "Newport"


async def test_update_clears_address(db_session: AsyncSession, user) -> None:
    address = Address(line1="1 Old St", line2=None, city="X", region="Y", postal_code="00000", country="US")
    db_session.add(address)
    await db_session.flush()
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, address_id=address.id
    )
    await db_session.flush()
    await db_session.refresh(event, attribute_names=["address"])
    deps = _make_deps(db_session, user)

    start, end = _base_window()
    data = UpdateCalendarEventData(
        start=start,
        end=end,
        all_day=False,
        name=None,
        address=None,
        description=None,
        attendees=[],
        survey_id=None,
        client_id=None,
    )
    await UpdateCalendarEvent.execute(event, data, db_session, deps)
    assert event.address_id is None


async def test_confirm_from_tentative(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=CalendarEventState.tentative
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)

    assert ConfirmCalendarEvent.is_available(event, deps) is True
    await ConfirmCalendarEvent.execute(event, EmptyActionData(), db_session, deps)
    await db_session.flush()

    assert event.state == CalendarEventState.confirmed
    log = (
        await db_session.execute(
            select(StateTransitionLog).where(
                StateTransitionLog.object_type == "calendar_events",
                StateTransitionLog.object_id == event.id,
            )
        )
    ).scalar_one()
    assert log.to_state == CalendarEventState.confirmed.value


async def test_confirm_from_confirmed_blocked(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=CalendarEventState.confirmed
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)

    assert ConfirmCalendarEvent.is_available(event, deps) is False
    with pytest.raises(InvalidTransitionError):
        await ConfirmCalendarEvent.execute(event, EmptyActionData(), db_session, deps)


async def test_complete_from_confirmed(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=CalendarEventState.confirmed
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)
    await CompleteCalendarEvent.execute(event, EmptyActionData(), db_session, deps)
    assert event.state == CalendarEventState.completed


@pytest.mark.parametrize("start_state", [CalendarEventState.tentative, CalendarEventState.confirmed])
async def test_cancel_from_active(db_session: AsyncSession, user, start_state) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=start_state
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)
    await CancelCalendarEvent.execute(event, EmptyActionData(), db_session, deps)
    assert event.state == CalendarEventState.cancelled


async def test_cancel_from_completed_blocked(db_session: AsyncSession, user) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=CalendarEventState.completed
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)
    assert CancelCalendarEvent.is_available(event, deps) is False


@pytest.mark.parametrize(
    "start_state",
    [
        CalendarEventState.tentative,
        CalendarEventState.confirmed,
        CalendarEventState.completed,
        CalendarEventState.cancelled,
    ],
)
async def test_delete_in_any_state(db_session: AsyncSession, user, start_state) -> None:
    event = await CalendarEventFactory.create_async(
        session=db_session, organization_id=user.organization_id, state=start_state
    )
    await db_session.flush()
    deps = _make_deps(db_session, user)

    assert DeleteCalendarEvent.is_available(event, deps) is True
    await DeleteCalendarEvent.execute(event, EmptyActionData(), db_session, deps)
    assert event.deleted_at is not None
