"""Core state machine types: Transition, State, StateMachine, StateMachineService."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Any, ClassVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.base.models import BaseDBModel
from app.state_machine.exceptions import InvalidTransitionError
from app.state_machine.models import StateTransitionLog
from app.users.roles import Role

if TYPE_CHECKING:
    from app.users.models import User

SYSTEM_USER_ID = 1


def _humanize(value: Any) -> str:
    """Turn an enum value like 'pending_billing' into 'Pending Billing'."""
    s = value.value if isinstance(value, Enum) else str(value)
    return s.replace("_", " ").title()


@dataclass(frozen=True)
class Transition[E: Enum]:
    """One outbound edge from a state.

    roles semantics:
        None            -> SYSTEM only — only system_transition() can use this edge
        set()/frozenset() -> any authenticated role
        {Role.X, ...}   -> specific roles only
    """

    to: E
    roles: frozenset[Role] | None

    def __init__(self, to: E, *, roles: set[Role] | frozenset[Role] | None) -> None:
        object.__setattr__(self, "to", to)
        object.__setattr__(self, "roles", frozenset(roles) if roles is not None else None)


class State[E: Enum, M: BaseDBModel]:
    """Base class for a state definition. Subclass per state in a machine."""

    value: ClassVar[Enum]
    transitions: ClassVar[list[Transition]]

    async def on_enter(
        self,
        service: StateMachineService,
        obj: M,
        from_state: E,
        context: dict[str, Any] | None,
    ) -> None:
        """Called after obj.state is set and the log row is written. Side effects only."""

    async def on_exit(
        self,
        service: StateMachineService,
        obj: M,
        to_state: E,
        context: dict[str, Any] | None,
    ) -> None:
        """Called before obj.state is changed. Side effects only."""

    def allowed_for(self, user_role: Role | None) -> list[E]:
        """Return target states reachable from this state for the given caller.

        user_role=None means system caller — only SYSTEM edges are returned.
        """
        if user_role is None:
            return [t.to for t in self.transitions if t.roles is None]
        return [t.to for t in self.transitions if t.roles is not None and (not t.roles or user_role in t.roles)]

    def get_transition(self, to: E) -> Transition[E] | None:
        return next((t for t in self.transitions if t.to == to), None)


STATE_MACHINE_REGISTRY: dict[type[Enum], StateMachine[Any, Any]] = {}


@dataclass
class StateMachine[E: Enum, M: BaseDBModel]:
    """Pure definition — no session, no DI. Defined at module level per domain."""

    enum_type: type[E]
    states: dict[E, type[State[E, M]]]

    def __post_init__(self) -> None:
        STATE_MACHINE_REGISTRY[self.enum_type] = self

    def get_state(self, obj: M) -> State[E, M]:
        current = self.enum_type(obj.state)  # type: ignore[attr-defined]
        return self.states[current]()

    def can_transition(self, obj: M, to: E, user_role: Role) -> bool:
        """Check if a user with this role can transition obj to the target state."""
        state = self.get_state(obj)
        return to in state.allowed_for(user_role)

    def has_any_transition(self, obj: M, user_role: Role) -> bool:
        """Check if a user with this role can make any transition from the current state."""
        state = self.get_state(obj)
        return len(state.allowed_for(user_role)) > 0


class StateMachineService:
    """Session-bound service. One instance per request (provided via Litestar DI)."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def transition(
        self,
        machine: StateMachine[Any, Any],
        obj: Any,
        to: Any,
        *,
        actor: User,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Human-initiated transition. Validates topology and roles."""
        state = machine.get_state(obj)
        transition = state.get_transition(to)

        from_label = _humanize(obj.state)
        to_label = _humanize(to)

        if transition is None:
            raise InvalidTransitionError(
                detail=f"This item cannot be moved from {from_label} to {to_label}.",
            )

        if transition.roles is None:
            raise InvalidTransitionError(
                detail=f"Moving from {from_label} to {to_label} can only be done by the system.",
            )

        if transition.roles and actor.role_enum not in transition.roles:
            allowed = ", ".join(_humanize(r.value) for r in sorted(transition.roles, key=lambda r: r.value))
            raise InvalidTransitionError(
                detail=f"Your role does not have permission to do this. Only {allowed} users can perform this action.",
            )

        await self._execute_transition(machine, obj, state, to, actor_id=actor.id, context=context)

    async def system_transition(
        self,
        machine: StateMachine[Any, Any],
        obj: Any,
        to: Any,
        *,
        context: dict[str, Any] | None = None,
    ) -> None:
        """System/cron transition. Only SYSTEM edges allowed. actor_id = SYSTEM_USER_ID."""
        state = machine.get_state(obj)
        transition = state.get_transition(to)

        if transition is None:
            raise InvalidTransitionError(
                detail=f"No transition from {obj.state!r} to {to!r}",
            )

        if transition.roles is not None:
            raise InvalidTransitionError(
                detail=f"Transition {obj.state!r} -> {to!r} is not a system edge",
            )

        await self._execute_transition(machine, obj, state, to, actor_id=SYSTEM_USER_ID, context=context)

    def allowed_transitions(
        self,
        machine: StateMachine[Any, Any],
        obj: Any,
        actor: User,
    ) -> frozenset[Any]:
        """States this user can transition obj to from its current state."""
        state = machine.get_state(obj)
        return frozenset(state.allowed_for(actor.role_enum))

    async def _execute_transition(
        self,
        machine: StateMachine[Any, Any],
        obj: Any,
        current_state: State[Any, Any],
        to: Any,
        *,
        actor_id: int,
        context: dict[str, Any] | None,
    ) -> None:
        """Shared execution: on_exit -> set state -> log -> on_enter."""
        from_state = obj.state

        # 1. on_exit
        await current_state.on_exit(self, obj, to, context)

        # 2. Set state
        obj.state = to

        # 3. Write audit log (stores .value for human readability)
        log = StateTransitionLog(
            object_type=obj.__tablename__,
            object_id=obj.id,
            from_state=from_state.value if hasattr(from_state, "value") else str(from_state),
            to_state=to.value if hasattr(to, "value") else str(to),
            actor_id=actor_id,
            context=context,
        )
        self.db_session.add(log)

        # 4. on_enter
        target_state = machine.states[to]()
        await target_state.on_enter(self, obj, from_state, context)
