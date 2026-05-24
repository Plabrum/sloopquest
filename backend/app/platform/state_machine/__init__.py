"""Reusable state machine framework.

Core types: Transition, State, StateMachine, StateMachineService.
Models: StateMachineMixin, StateTransitionLog.
"""

from app.platform.state_machine.exceptions import InvalidTransitionError
from app.platform.state_machine.machine import (
    SYSTEM_USER_ID,
    State,
    StateMachine,
    StateMachineService,
    Transition,
)
from app.platform.state_machine.models import StateMachineMixin, StateTransitionLog

__all__ = [
    "SYSTEM_USER_ID",
    "InvalidTransitionError",
    "State",
    "StateMachine",
    "StateMachineMixin",
    "StateMachineService",
    "StateTransitionLog",
    "Transition",
]
