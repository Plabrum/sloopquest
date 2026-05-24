from datetime import date as date_type, datetime
from decimal import Decimal

from app.domain.calendar_events.enums import CalendarEventState
from app.platform.actions.schemas import ActionableDetail, ActionableList
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


class CalendarEventListItem(ActionableList):
    id: Sqid
    state: CalendarEventState
    start: datetime | None
    end: datetime | None
    start_date: date_type | None
    end_date: date_type | None
    all_day: bool
    name: str | None
    address_line1: str | None
    survey_id: Sqid | None
    client_id: Sqid | None
    created_at: datetime


class CreateCalendarEventData(BaseSchema):
    all_day: bool = False
    start: datetime | None = None
    end: datetime | None = None
    start_date: date_type | None = None
    end_date: date_type | None = None
    name: str | None = None
    address: AddressInput | None = None
    description: str | None = None
    attendees: list[str] = []
    survey_id: Sqid | None = None
    client_id: Sqid | None = None


class UpdateCalendarEventData(BaseSchema):
    all_day: bool
    start: datetime | None
    end: datetime | None
    start_date: date_type | None
    end_date: date_type | None
    name: str | None
    address: AddressInput | None
    description: str | None
    attendees: list[str]
    survey_id: Sqid | None
    client_id: Sqid | None


class CalendarEventDetail(ActionableDetail):
    id: Sqid
    state: CalendarEventState
    start: datetime | None
    end: datetime | None
    start_date: date_type | None
    end_date: date_type | None
    all_day: bool
    name: str | None
    address: AddressOutput | None
    description: str | None
    attendees: list[str]
    survey_id: Sqid | None
    client_id: Sqid | None
    created_at: datetime
    updated_at: datetime
