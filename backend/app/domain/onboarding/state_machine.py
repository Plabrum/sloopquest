from app.domain.onboarding.enums import OnboardingState
from app.domain.onboarding.models import Onboarding
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_system: set[Role] = {Role.SYSTEM}
_member: set[Role] = {Role.MEMBER, Role.ADMIN}


class NotStartedState(State[OnboardingState, Onboarding]):
    value = OnboardingState.NOT_STARTED
    transitions = [Transition(to=OnboardingState.INBOX, roles=_system)]


class InboxState(State[OnboardingState, Onboarding]):
    value = OnboardingState.INBOX
    transitions = [Transition(to=OnboardingState.PRICING, roles=_member)]


class PricingState(State[OnboardingState, Onboarding]):
    value = OnboardingState.PRICING
    transitions = [Transition(to=OnboardingState.COMPLETED, roles=_member)]


class CompletedState(State[OnboardingState, Onboarding]):
    value = OnboardingState.COMPLETED
    transitions = []


onboarding_state_machine = StateMachine(
    enum_type=OnboardingState,
    states={
        OnboardingState.NOT_STARTED: NotStartedState,
        OnboardingState.INBOX: InboxState,
        OnboardingState.PRICING: PricingState,
        OnboardingState.COMPLETED: CompletedState,
    },
)
