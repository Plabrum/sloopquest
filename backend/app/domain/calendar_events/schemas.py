from datetime import datetime
from decimal import Decimal

from app.domain.calendar_events.enums import CalendarEventState
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class AddressInput(BaseSchema):
    line1: str
    city: str
    region: str
    postal_code: str
    line2: str | None = None
    country: str = "US"


class AddressOutput(BaseSchema):
    id: Sqid
    line1: str
    line2: str | None
    city: str
    region: str
    postal_code: str
    country: str
    lat: Decimal | None
    lng: Decimal | None


class CalendarEventListItem(BaseSchema):
    id: Sqid
    state: CalendarEventState
    start: datetime
    end: datetime
    all_day: bool
    name: str | None
    address_line1: str | None
    survey_id: Sqid | None
    client_id: Sqid | None
    created_at: datetime


class CreateCalendarEventData(BaseSchema):
    start: datetime
    end: datetime
    all_day: bool = False
    name: str | None = None
    address: AddressInput | None = None
    description: str | None = None
    attendees: list[str] = []
    survey_id: Sqid | None = None
    client_id: Sqid | None = None


class UpdateCalendarEventData(BaseSchema):
    start: datetime
    end: datetime
    all_day: bool
    name: str | None
    address: AddressInput | None
    description: str | None
    attendees: list[str]
    survey_id: Sqid | None
    client_id: Sqid | None


class CalendarEventDetail(BaseSchema):
    id: Sqid
    state: CalendarEventState
    start: datetime
    end: datetime
    all_day: bool
    name: str | None
    address: AddressOutput | None
    description: str | None
    attendees: list[str]
    survey_id: Sqid | None
    client_id: Sqid | None
    created_at: datetime
    updated_at: datetime
