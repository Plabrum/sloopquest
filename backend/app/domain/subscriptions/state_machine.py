from app.domain.subscriptions.enums import SubscriptionStatus
from app.domain.subscriptions.models import Subscription
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}
_system: set[Role] = {Role.SYSTEM}


class TrialingState(State[SubscriptionStatus, Subscription]):
    value = SubscriptionStatus.trialing
    transitions = [
        Transition(to=SubscriptionStatus.active, roles=_system),
        Transition(to=SubscriptionStatus.cancelled, roles=_staff),
    ]


class ActiveState(State[SubscriptionStatus, Subscription]):
    value = SubscriptionStatus.active
    transitions = [
        Transition(to=SubscriptionStatus.past_due, roles=_system),
        Transition(to=SubscriptionStatus.paused, roles=_staff),
        Transition(to=SubscriptionStatus.cancelled, roles=_staff),
    ]


class PastDueState(State[SubscriptionStatus, Subscription]):
    value = SubscriptionStatus.past_due
    transitions = [
        Transition(to=SubscriptionStatus.active, roles=_system),
        Transition(to=SubscriptionStatus.cancelled, roles=_staff),
    ]


class PausedState(State[SubscriptionStatus, Subscription]):
    value = SubscriptionStatus.paused
    transitions = [
        Transition(to=SubscriptionStatus.active, roles=_staff),
        Transition(to=SubscriptionStatus.cancelled, roles=_staff),
    ]


class CancelledState(State[SubscriptionStatus, Subscription]):
    value = SubscriptionStatus.cancelled
    transitions = []


subscription_state_machine = StateMachine(
    enum_type=SubscriptionStatus,
    states={
        SubscriptionStatus.trialing: TrialingState,
        SubscriptionStatus.active: ActiveState,
        SubscriptionStatus.past_due: PastDueState,
        SubscriptionStatus.paused: PausedState,
        SubscriptionStatus.cancelled: CancelledState,
    },
)
