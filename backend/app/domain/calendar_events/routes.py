from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import joinedload

from app.domain.calendar_events.models import CalendarEvent
from app.domain.calendar_events.schemas import (
    AddressOutput,
    CalendarEventDetail,
    CalendarEventListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(event: CalendarEvent, user: User) -> CalendarEventListItem:
    return CalendarEventListItem(
        id=event.id,
        state=event.state,
        start=event.start,
        end=event.end,
        start_date=event.start_date,
        end_date=event.end_date,
        all_day=event.all_day,
        name=event.name,
        address_line1=event.address.line1 if event.address else None,
        survey_id=event.survey_id,
        client_id=event.client_id,
        created_at=event.created_at,
    )


def _to_detail(event: CalendarEvent, user: User) -> CalendarEventDetail:
    address = (
        AddressOutput(
            id=event.address.id,
            line1=event.address.line1,
            line2=event.address.line2,
            city=event.address.city,
            region=event.address.region,
            postal_code=event.address.postal_code,
            country=event.address.country,
            lat=event.address.lat,
            lng=event.address.lng,
        )
        if event.address
        else None
    )
    return CalendarEventDetail(
        id=event.id,
        state=event.state,
        start=event.start,
        end=event.end,
        start_date=event.start_date,
        end_date=event.end_date,
        all_day=event.all_day,
        name=event.name,
        address=address,
        description=event.description,
        attendees=list(event.attendees or []),
        survey_id=event.survey_id,
        client_id=event.client_id,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


_config = CRUDConfig(
    model=CalendarEvent,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    list_load_options=[joinedload(CalendarEvent.address)],
    detail_load_options=[joinedload(CalendarEvent.address)],
    filterable_columns={"state", "survey_id", "client_id", "start", "end", "effective_start", "created_at"},
    sortable_columns={"start", "end", "effective_start", "created_at"},
    default_sort="effective_start",
    label_field=None,
)

_controller = make_crud_controller("", _config)

calendar_event_router = Router(
    path="/calendar-events",
    route_handlers=[_controller],
    tags=["calendar-events"],
)
