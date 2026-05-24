"""Factories for Event log entries."""

from datetime import UTC, datetime

from polyfactory import Use

from app.platform.events.enums import EventType
from app.platform.events.models import Event

from .base import BaseFactory


class EventFactory(BaseFactory):
    __model__ = Event

    actor_id = None
    organization_id = None
    object_type = "test_object"
    object_id = Use(lambda: 1)
    event_type = EventType.CREATED
    event_data = None
    created_at = Use(lambda: datetime.now(tz=UTC))
    updated_at = Use(lambda: datetime.now(tz=UTC))
