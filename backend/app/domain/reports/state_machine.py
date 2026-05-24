from app.domain.reports.enums import ReportState
from app.domain.reports.models import Report
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}


class DraftState(State[ReportState, Report]):
    value = ReportState.draft
    transitions = [
        Transition(to=ReportState.ready_for_review, roles=_staff),
    ]


class ReadyForReviewState(State[ReportState, Report]):
    value = ReportState.ready_for_review
    transitions = [
        Transition(to=ReportState.draft, roles=_staff),
        Transition(to=ReportState.watermarked_delivered, roles=_staff),
    ]


class WatermarkedDeliveredState(State[ReportState, Report]):
    value = ReportState.watermarked_delivered
    transitions = [
        Transition(to=ReportState.released, roles=_staff),
    ]


class ReleasedState(State[ReportState, Report]):
    value = ReportState.released
    transitions = []


report_state_machine = StateMachine(
    enum_type=ReportState,
    states={
        ReportState.draft: DraftState,
        ReportState.ready_for_review: ReadyForReviewState,
        ReportState.watermarked_delivered: WatermarkedDeliveredState,
        ReportState.released: ReleasedState,
    },
)
