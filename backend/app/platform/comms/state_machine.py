from app.domain.users.roles import Role
from app.platform.comms.enums import MessageState
from app.platform.comms.models.messages import Message
from app.platform.state_machine.machine import State, StateMachine, Transition

_system: set[Role] = {Role.SYSTEM}


class ReceivedState(State[MessageState, Message]):
    value = MessageState.RECEIVED
    transitions = []


class QueuedState(State[MessageState, Message]):
    value = MessageState.QUEUED
    transitions = [
        Transition(to=MessageState.SENT, roles=_system),
        Transition(to=MessageState.FAILED, roles=_system),
    ]


class SentState(State[MessageState, Message]):
    value = MessageState.SENT
    transitions = []


class FailedState(State[MessageState, Message]):
    value = MessageState.FAILED
    transitions = [
        Transition(to=MessageState.QUEUED, roles=_system),
    ]


message_state_machine = StateMachine(
    enum_type=MessageState,
    states={
        MessageState.RECEIVED: ReceivedState,
        MessageState.QUEUED: QueuedState,
        MessageState.SENT: SentState,
        MessageState.FAILED: FailedState,
    },
)
