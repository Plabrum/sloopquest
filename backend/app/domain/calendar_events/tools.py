"""LLM tools for calendar events."""

from datetime import date as date_type, datetime
from typing import Any

from msgspec import Struct
from sqlalchemy import select

from app.domain.calendar_events.actions import _upsert_address, _validate_attendees, _validate_window
from app.domain.calendar_events.models import CalendarEvent
from app.domain.calendar_events.schemas import AddressInput
from app.domain.clients.models import Client
from app.domain.surveys.models import Survey
from app.platform.llm.registry import SloopTool, ToolContext, ToolResult, register_tool
from app.platform.llm.schemas import InputSchema, PropertySchema
from app.utils.sqids import Sqid


class ListCalendarEventsInput(Struct):
    start_after: datetime | None = None
    end_before: datetime | None = None
    state: str | None = None
    client_id: Sqid | None = None
    survey_id: Sqid | None = None
    limit: int = 20


@register_tool
class ListCalendarEventsTool(SloopTool):
    name = "list_calendar_events"
    description = "List calendar events, optionally filtered by time window, state, client, or survey."
    input_schema = InputSchema(
        properties={
            "start_after": PropertySchema(
                type="string",
                description="Only include events starting at or after this ISO-8601 timestamp (optional).",
            ),
            "end_before": PropertySchema(
                type="string",
                description="Only include events ending at or before this ISO-8601 timestamp (optional).",
            ),
            "state": PropertySchema(
                type="string",
                description="Filter by event state: tentative, confirmed, completed, cancelled (optional).",
            ),
            "client_id": PropertySchema(type="string", description="Filter by client SQID (optional)."),
            "survey_id": PropertySchema(type="string", description="Filter by survey SQID (optional)."),
            "limit": PropertySchema(type="integer", description="Maximum results to return (default 20)."),
        },
    )
    input_struct = ListCalendarEventsInput

    async def execute(self, ctx: ToolContext, args: ListCalendarEventsInput) -> ToolResult | str:
        stmt = (
            select(CalendarEvent, Client.display_name.label("client_name"))
            .outerjoin(Client, CalendarEvent.client_id == Client.id)
            .where(CalendarEvent.organization_id == ctx.user.organization_id)
            .order_by(CalendarEvent.effective_start.asc())
            .limit(args.limit)
        )
        if args.start_after is not None:
            stmt = stmt.where(CalendarEvent.effective_start >= args.start_after)
        if args.end_before is not None:
            stmt = stmt.where(CalendarEvent.effective_start <= args.end_before)
        if args.state is not None:
            stmt = stmt.where(CalendarEvent.state == args.state)
        if args.client_id is not None:
            stmt = stmt.where(CalendarEvent.client_id == int(args.client_id))
        if args.survey_id is not None:
            stmt = stmt.where(CalendarEvent.survey_id == int(args.survey_id))

        result = await ctx.db.execute(stmt)
        rows = result.all()

        if not rows:
            return ToolResult(message="No calendar events found.")

        data: list[dict[str, Any]] = [
            {
                "id": Sqid(event.id),
                "name": event.name,
                "state": event.state,
                "all_day": event.all_day,
                "start": event.start.isoformat() if event.start else None,
                "end": event.end.isoformat() if event.end else None,
                "start_date": event.start_date.isoformat() if event.start_date else None,
                "end_date": event.end_date.isoformat() if event.end_date else None,
                "client_name": client_name,
                "survey_id": Sqid(event.survey_id) if event.survey_id else None,
            }
            for event, client_name in rows
        ]
        return ToolResult(data=data)


class GetCalendarEventInput(Struct):
    event_id: Sqid


@register_tool
class GetCalendarEventTool(SloopTool):
    name = "get_calendar_event"
    description = "Get details for a specific calendar event by ID."
    input_schema = InputSchema(
        properties={
            "event_id": PropertySchema(type="string", description="The calendar event's SQID."),
        },
        required=["event_id"],
    )
    input_struct = GetCalendarEventInput

    async def execute(self, ctx: ToolContext, args: GetCalendarEventInput) -> ToolResult | str:
        stmt = (
            select(
                CalendarEvent,
                Client.display_name.label("client_name"),
                Survey.id.label("survey_id"),
            )
            .outerjoin(Client, CalendarEvent.client_id == Client.id)
            .outerjoin(Survey, CalendarEvent.survey_id == Survey.id)
            .where(
                CalendarEvent.id == int(args.event_id),
                CalendarEvent.organization_id == ctx.user.organization_id,
            )
        )
        result = await ctx.db.execute(stmt)
        row = result.one_or_none()

        if row is None:
            return "Calendar event not found."

        event, client_name, survey_id = row
        return ToolResult(
            data={
                "id": Sqid(event.id),
                "name": event.name,
                "state": event.state,
                "all_day": event.all_day,
                "start": event.start.isoformat() if event.start else None,
                "end": event.end.isoformat() if event.end else None,
                "start_date": event.start_date.isoformat() if event.start_date else None,
                "end_date": event.end_date.isoformat() if event.end_date else None,
                "client_name": client_name,
                "survey_id": Sqid(survey_id) if survey_id else None,
                "description": event.description,
                "attendees": event.attendees,
            }
        )


class CreateCalendarEventAddress(Struct):
    line1: str
    city: str
    region: str
    postal_code: str
    line2: str | None = None
    country: str = "US"


class CreateCalendarEventInput(Struct):
    all_day: bool = False
    start: datetime | None = None
    end: datetime | None = None
    start_date: date_type | None = None
    end_date: date_type | None = None
    name: str | None = None
    description: str | None = None
    attendees: list[str] = []
    address: CreateCalendarEventAddress | None = None
    survey_id: Sqid | None = None
    client_id: Sqid | None = None


@register_tool
class CreateCalendarEventTool(SloopTool):
    name = "create_calendar_event"
    description = (
        "Create a new calendar event. For timed events set all_day=false and provide start/end "
        "(ISO-8601 timestamps with timezone). For all-day events set all_day=true and provide "
        "start_date/end_date (YYYY-MM-DD, inclusive)."
    )
    input_schema = InputSchema(
        properties={
            "all_day": PropertySchema(type="boolean", description="True for all-day events; default false."),
            "start": PropertySchema(
                type="string", description="Start timestamp (ISO-8601) — required when not all_day."
            ),
            "end": PropertySchema(type="string", description="End timestamp (ISO-8601) — required when not all_day."),
            "start_date": PropertySchema(type="string", description="Start date (YYYY-MM-DD) — required when all_day."),
            "end_date": PropertySchema(type="string", description="End date (YYYY-MM-DD) — required when all_day."),
            "name": PropertySchema(type="string", description="Event title (optional)."),
            "description": PropertySchema(type="string", description="Event description (optional)."),
            "attendees": PropertySchema(type="array", description="Attendee email addresses (optional)."),
            "address": PropertySchema(type="object", description="Event address (optional)."),
            "survey_id": PropertySchema(type="string", description="Linked survey SQID (optional)."),
            "client_id": PropertySchema(type="string", description="Linked client SQID (optional)."),
        },
    )
    input_struct = CreateCalendarEventInput

    async def execute(self, ctx: ToolContext, args: CreateCalendarEventInput) -> ToolResult | str:
        start, end, start_date, end_date = _validate_window(
            args.start, args.end, args.start_date, args.end_date, args.all_day
        )
        attendees = _validate_attendees(list(args.attendees))
        address_input = (
            AddressInput(
                line1=args.address.line1,
                line2=args.address.line2,
                city=args.address.city,
                region=args.address.region,
                postal_code=args.address.postal_code,
                country=args.address.country,
            )
            if args.address is not None
            else None
        )
        address_id = await _upsert_address(ctx.db, None, address_input)
        event = CalendarEvent(
            organization_id=ctx.user.organization_id,
            start=start,
            end=end,
            start_date=start_date,
            end_date=end_date,
            all_day=args.all_day,
            name=args.name,
            address_id=address_id,
            description=args.description,
            attendees=attendees,
            survey_id=args.survey_id,
            client_id=args.client_id,
        )
        ctx.db.add(event)
        await ctx.db.flush()
        ctx.invalidate_keys.append("/calendar-events")
        return ToolResult(
            message="Calendar event created.",
            data={"id": Sqid(event.id), "name": event.name},
        )
