from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}


class ScheduledState(State[SurveyState, Survey]):
    value = SurveyState.scheduled
    transitions = [
        Transition(to=SurveyState.in_draft, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class InDraftState(State[SurveyState, Survey]):
    value = SurveyState.in_draft
    transitions = [
        Transition(to=SurveyState.delivered, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class DeliveredState(State[SurveyState, Survey]):
    value = SurveyState.delivered
    transitions = []


class CancelledState(State[SurveyState, Survey]):
    value = SurveyState.cancelled
    transitions = []


survey_state_machine = StateMachine(
    enum_type=SurveyState,
    states={
        SurveyState.scheduled: ScheduledState,
        SurveyState.in_draft: InDraftState,
        SurveyState.delivered: DeliveredState,
        SurveyState.cancelled: CancelledState,
    },
)
