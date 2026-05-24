"""Factory for CalendarEvent."""

from datetime import UTC, datetime, timedelta

from app.domain.calendar_events.enums import CalendarEventState
from app.domain.calendar_events.models import CalendarEvent

from .base import BaseFactory


class CalendarEventFactory(BaseFactory):
    __model__ = CalendarEvent

    start = datetime.now(tz=UTC)
    end = datetime.now(tz=UTC) + timedelta(hours=1)
    all_day = False
    name = None
    address_id = None
    description = None
    attendees: list[str] = []
    survey_id = None
    client_id = None
    state = CalendarEventState.tentative
