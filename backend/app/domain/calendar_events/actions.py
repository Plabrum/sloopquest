from __future__ import annotations

import logging
import re
from datetime import date, datetime
from enum import StrEnum, auto

from litestar.exceptions import ValidationException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domain.addresses.models import Address
from app.domain.calendar_events.enums import CalendarEventState
from app.domain.calendar_events.models import CalendarEvent
from app.domain.calendar_events.schemas import AddressInput, CreateCalendarEventData, UpdateCalendarEventData
from app.domain.calendar_events.state_machine import calendar_event_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CalendarEventActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    CONFIRM = auto()
    COMPLETE = auto()
    CANCEL = auto()


calendar_event_actions = action_group_factory(
    group_type=ActionGroupType.CALENDAR_EVENT_ACTIONS,
    default_invalidation="/calendar-events",
    model_type=CalendarEvent,
    load_options=[joinedload(CalendarEvent.address)],
)


def _validate_window(
    start: datetime | None,
    end: datetime | None,
    start_date: date | None,
    end_date: date | None,
    all_day: bool,
) -> tuple[datetime | None, datetime | None, date | None, date | None]:
    if all_day:
        if start_date is None or end_date is None:
            raise ValidationException("start_date and end_date are required when all_day is true")
        if end_date < start_date:
            raise ValidationException("end_date must be on or after start_date")
        return None, None, start_date, end_date
    if start is None or end is None:
        raise ValidationException("start and end are required when all_day is false")
    if end <= start:
        raise ValidationException("end must be after start")
    return start, end, None, None


def _validate_attendees(attendees: list[str]) -> list[str]:
    for entry in attendees:
        if not entry or not _EMAIL_RE.match(entry):
            raise ValidationException(f"Invalid attendee email: {entry!r}")
    return attendees


async def _upsert_address(transaction: AsyncSession, existing: Address | None, data: AddressInput | None) -> int | None:
    if data is None:
        return None
    if existing is None:
        address = Address(
            line1=data.line1,
            line2=data.line2,
            city=data.city,
            region=data.region,
            postal_code=data.postal_code,
            country=data.country,
        )
        transaction.add(address)
        await transaction.flush()
        return address.id
    existing.line1 = data.line1
    existing.line2 = data.line2
    existing.city = data.city
    existing.region = data.region
    existing.postal_code = data.postal_code
    existing.country = data.country
    return existing.id


@calendar_event_actions
class CreateCalendarEvent(BaseTopLevelAction[CreateCalendarEventData]):
    action_key = CalendarEventActionKey.CREATE
    label = "Create Calendar Event"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
        "client_id": {"model": "Client", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, data: CreateCalendarEventData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        start, end, start_date, end_date = _validate_window(
            data.start, data.end, data.start_date, data.end_date, data.all_day
        )
        attendees = _validate_attendees(list(data.attendees))
        address_id = await _upsert_address(transaction, None, data.address)
        event = CalendarEvent(
            organization_id=deps.user.organization_id,
            start=start,
            end=end,
            start_date=start_date,
            end_date=end_date,
            all_day=data.all_day,
            name=data.name,
            address_id=address_id,
            description=data.description,
            attendees=attendees,
            survey_id=data.survey_id,
            client_id=data.client_id,
        )
        transaction.add(event)
        await transaction.flush()
        return ActionExecutionResponse(message="Calendar event created", created_id=event.id)


@calendar_event_actions
class UpdateCalendarEvent(BaseObjectAction[CalendarEvent, UpdateCalendarEventData]):
    action_key = CalendarEventActionKey.UPDATE
    label = "Edit Calendar Event"
    icon = ActionIcon.EDIT
    priority = 20
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
        "client_id": {"model": "Client", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, obj: CalendarEvent, data: UpdateCalendarEventData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        start, end, start_date, end_date = _validate_window(
            data.start, data.end, data.start_date, data.end_date, data.all_day
        )
        attendees = _validate_attendees(list(data.attendees))
        address_id = await _upsert_address(transaction, obj.address, data.address)
        obj.start = start
        obj.end = end
        obj.start_date = start_date
        obj.end_date = end_date
        obj.all_day = data.all_day
        obj.name = data.name
        obj.address_id = address_id
        obj.description = data.description
        obj.attendees = attendees
        obj.survey_id = data.survey_id
        obj.client_id = data.client_id
        return ActionExecutionResponse(message="Calendar event updated")


@calendar_event_actions
class ConfirmCalendarEvent(BaseObjectAction[CalendarEvent, EmptyActionData]):
    action_key = CalendarEventActionKey.CONFIRM
    label = "Confirmed"
    icon = ActionIcon.CHECK
    priority = 30
    target_state = CalendarEventState.confirmed

    @classmethod
    def is_available(cls, obj: CalendarEvent, deps: ActionDeps) -> bool:
        return calendar_event_state_machine.can_transition(obj, CalendarEventState.confirmed, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: CalendarEvent, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(
            calendar_event_state_machine, obj, CalendarEventState.confirmed, actor=deps.user
        )
        return ActionExecutionResponse(message="Calendar event confirmed")


@calendar_event_actions
class CompleteCalendarEvent(BaseObjectAction[CalendarEvent, EmptyActionData]):
    action_key = CalendarEventActionKey.COMPLETE
    label = "Completed"
    icon = ActionIcon.CHECK
    priority = 31
    target_state = CalendarEventState.completed

    @classmethod
    def is_available(cls, obj: CalendarEvent, deps: ActionDeps) -> bool:
        return calendar_event_state_machine.can_transition(obj, CalendarEventState.completed, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: CalendarEvent, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(
            calendar_event_state_machine, obj, CalendarEventState.completed, actor=deps.user
        )
        return ActionExecutionResponse(message="Calendar event completed")


@calendar_event_actions
class CancelCalendarEvent(BaseObjectAction[CalendarEvent, EmptyActionData]):
    action_key = CalendarEventActionKey.CANCEL
    label = "Cancelled"
    icon = ActionIcon.X
    priority = 85
    confirmation_message = "Cancel this calendar event?"
    target_state = CalendarEventState.cancelled

    @classmethod
    def is_available(cls, obj: CalendarEvent, deps: ActionDeps) -> bool:
        return calendar_event_state_machine.can_transition(obj, CalendarEventState.cancelled, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: CalendarEvent, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(
            calendar_event_state_machine, obj, CalendarEventState.cancelled, actor=deps.user
        )
        return ActionExecutionResponse(message="Calendar event cancelled")


@calendar_event_actions
class DeleteCalendarEvent(BaseObjectAction[CalendarEvent, EmptyActionData]):
    action_key = CalendarEventActionKey.DELETE
    label = "Delete Calendar Event"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Delete this calendar event?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: CalendarEvent, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Calendar event deleted")
