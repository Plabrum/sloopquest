from app.domain.quotes.enums import QuoteState
from app.domain.quotes.models import Quote
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}
_client: set[Role] = {Role.CLIENT}


class DraftState(State[QuoteState, Quote]):
    value = QuoteState.draft
    transitions = [
        Transition(to=QuoteState.sent, roles=_staff),
    ]


class SentState(State[QuoteState, Quote]):
    value = QuoteState.sent
    transitions = [
        # Client accepts/declines via their portal
        Transition(to=QuoteState.accepted, roles=_client | _staff),
        Transition(to=QuoteState.declined, roles=_client | _staff),
    ]


class AcceptedState(State[QuoteState, Quote]):
    value = QuoteState.accepted
    transitions = []


class DeclinedState(State[QuoteState, Quote]):
    value = QuoteState.declined
    transitions = []


quote_state_machine = StateMachine(
    enum_type=QuoteState,
    states={
        QuoteState.draft: DraftState,
        QuoteState.sent: SentState,
        QuoteState.accepted: AcceptedState,
        QuoteState.declined: DeclinedState,
    },
)
