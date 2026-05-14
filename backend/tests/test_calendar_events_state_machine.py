"""State machine tests for CalendarEvent."""

from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.domain.calendar_events.enums import CalendarEventState
from app.domain.calendar_events.state_machine import calendar_event_state_machine
from app.domain.users.models import User
from app.domain.users.roles import Role
from app.platform.state_machine.exceptions import InvalidTransitionError
from app.platform.state_machine.machine import StateMachineService


class FakeEvent:
    __tablename__ = "calendar_events"

    def __init__(self, state: CalendarEventState = CalendarEventState.tentative) -> None:
        self.id = 1
        self.organization_id = 1
        self.state = state


class FakeUser:
    def __init__(self, role: Role = Role.ADMIN) -> None:
        self.id = 42
        self.organization_id = 1
        self.role = role


@pytest.fixture
def service() -> StateMachineService:
    s = MagicMock()
    s.flush = AsyncMock()
    return StateMachineService(transaction=s)


@pytest.mark.parametrize(
    ("start", "to"),
    [
        (CalendarEventState.tentative, CalendarEventState.confirmed),
        (CalendarEventState.tentative, CalendarEventState.cancelled),
        (CalendarEventState.confirmed, CalendarEventState.completed),
        (CalendarEventState.confirmed, CalendarEventState.cancelled),
    ],
)
async def test_allowed_transitions(
    service: StateMachineService, start: CalendarEventState, to: CalendarEventState
) -> None:
    event = FakeEvent(state=start)
    actor = FakeUser(role=Role.ADMIN)
    await service.transition(calendar_event_state_machine, event, to, actor=cast(User, actor))
    assert event.state == to


@pytest.mark.parametrize(
    ("start", "to"),
    [
        (CalendarEventState.tentative, CalendarEventState.completed),
        (CalendarEventState.completed, CalendarEventState.confirmed),
        (CalendarEventState.cancelled, CalendarEventState.confirmed),
        (CalendarEventState.confirmed, CalendarEventState.tentative),
    ],
)
async def test_disallowed_transitions(
    service: StateMachineService, start: CalendarEventState, to: CalendarEventState
) -> None:
    event = FakeEvent(state=start)
    actor = FakeUser(role=Role.ADMIN)
    with pytest.raises(InvalidTransitionError):
        await service.transition(calendar_event_state_machine, event, to, actor=cast(User, actor))
