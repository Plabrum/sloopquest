from app.domain.calendar_events.enums import CalendarEventState
from app.domain.calendar_events.models import CalendarEvent
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}


class TentativeState(State[CalendarEventState, CalendarEvent]):
    value = CalendarEventState.tentative
    transitions = [
        Transition(to=CalendarEventState.confirmed, roles=_staff),
        Transition(to=CalendarEventState.cancelled, roles=_staff),
    ]


class ConfirmedState(State[CalendarEventState, CalendarEvent]):
    value = CalendarEventState.confirmed
    transitions = [
        Transition(to=CalendarEventState.completed, roles=_staff),
        Transition(to=CalendarEventState.cancelled, roles=_staff),
    ]


class CompletedState(State[CalendarEventState, CalendarEvent]):
    value = CalendarEventState.completed
    transitions = []


class CancelledState(State[CalendarEventState, CalendarEvent]):
    value = CalendarEventState.cancelled
    transitions = []


calendar_event_state_machine = StateMachine(
    enum_type=CalendarEventState,
    states={
        CalendarEventState.tentative: TentativeState,
        CalendarEventState.confirmed: ConfirmedState,
        CalendarEventState.completed: CompletedState,
        CalendarEventState.cancelled: CancelledState,
    },
)
