from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}
_system: set[Role] = {Role.SYSTEM}


class InquiryState(State[SurveyState, Survey]):
    value = SurveyState.inquiry
    transitions = [
        Transition(to=SurveyState.quoted, roles=_staff | _system),
        Transition(to=SurveyState.scheduled, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class QuotedState(State[SurveyState, Survey]):
    value = SurveyState.quoted
    transitions = [
        Transition(to=SurveyState.scheduled, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class ScheduledState(State[SurveyState, Survey]):
    value = SurveyState.scheduled
    transitions = [
        Transition(to=SurveyState.in_field, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class InFieldState(State[SurveyState, Survey]):
    value = SurveyState.in_field
    transitions = [
        Transition(to=SurveyState.in_draft, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class InDraftState(State[SurveyState, Survey]):
    value = SurveyState.in_draft
    transitions = [
        Transition(to=SurveyState.in_review, roles=_staff),
        Transition(to=SurveyState.cancelled, roles=_staff),
    ]


class InReviewState(State[SurveyState, Survey]):
    value = SurveyState.in_review
    transitions = [
        Transition(to=SurveyState.in_draft, roles=_staff),
        Transition(to=SurveyState.delivered, roles=_staff),
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
        SurveyState.inquiry: InquiryState,
        SurveyState.quoted: QuotedState,
        SurveyState.scheduled: ScheduledState,
        SurveyState.in_field: InFieldState,
        SurveyState.in_draft: InDraftState,
        SurveyState.in_review: InReviewState,
        SurveyState.delivered: DeliveredState,
        SurveyState.cancelled: CancelledState,
    },
)
