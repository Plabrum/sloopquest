"""Unit tests for the state machine framework."""

from enum import StrEnum, auto
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.state_machine.exceptions import InvalidTransitionError
from app.state_machine.machine import (
    State,
    StateMachine,
    StateMachineService,
    Transition,
)
from app.state_machine.models import StateTransitionLog
from app.users.roles import Role


class DocStatus(StrEnum):
    DRAFT = auto()
    ACTIVE = auto()
    ARCHIVED = auto()


class DraftState(State[DocStatus, Any]):
    value = DocStatus.DRAFT
    transitions = [
        Transition(to=DocStatus.ACTIVE, roles={Role.ADMIN}),
    ]


class ActiveState(State[DocStatus, Any]):
    value = DocStatus.ACTIVE
    transitions = [
        Transition(to=DocStatus.ARCHIVED, roles=None),  # system-only
    ]


class ArchivedState(State[DocStatus, Any]):
    value = DocStatus.ARCHIVED
    transitions = []


doc_machine = StateMachine[DocStatus, Any](
    enum_type=DocStatus,
    states={
        DocStatus.DRAFT: DraftState,
        DocStatus.ACTIVE: ActiveState,
        DocStatus.ARCHIVED: ArchivedState,
    },
)


class FakeDoc:
    __tablename__ = "fake_docs"

    def __init__(self, state: DocStatus = DocStatus.DRAFT) -> None:
        self.id = 1
        self.state = state


class FakeUser:
    def __init__(self, role: Role) -> None:
        self.id = 42
        self.organization_id = 1
        self.role_enum = role


@pytest.fixture
def session() -> MagicMock:
    return MagicMock()


@pytest.fixture
def service(session: MagicMock) -> StateMachineService:
    return StateMachineService(db_session=session)


async def test_valid_transition_logs_and_advances(service: StateMachineService, session: MagicMock) -> None:
    doc = FakeDoc(state=DocStatus.DRAFT)
    actor = FakeUser(role=Role.ADMIN)

    await service.transition(doc_machine, doc, DocStatus.ACTIVE, actor=actor, context={"reason": "ready"})

    assert doc.state == DocStatus.ACTIVE
    session.add.assert_called_once()
    log = session.add.call_args.args[0]
    assert isinstance(log, StateTransitionLog)
    assert log.object_type == "fake_docs"
    assert log.object_id == 1
    assert log.from_state == DocStatus.DRAFT.value
    assert log.to_state == DocStatus.ACTIVE.value
    assert log.actor_id == 42
    assert log.context == {"reason": "ready"}


async def test_invalid_transition_raises(service: StateMachineService) -> None:
    doc = FakeDoc(state=DocStatus.DRAFT)
    actor = FakeUser(role=Role.ADMIN)

    with pytest.raises(InvalidTransitionError):
        await service.transition(doc_machine, doc, DocStatus.ARCHIVED, actor=actor)


async def test_role_restricted_transition_rejects_wrong_role(service: StateMachineService) -> None:
    # Add a second role for this test
    class TmpRole(StrEnum):
        OTHER = auto()

    doc = FakeDoc(state=DocStatus.DRAFT)
    actor = FakeUser(role=TmpRole.OTHER)  # type: ignore[arg-type]

    with pytest.raises(InvalidTransitionError):
        await service.transition(doc_machine, doc, DocStatus.ACTIVE, actor=actor)


async def test_system_only_edge_rejects_human_actor(service: StateMachineService) -> None:
    doc = FakeDoc(state=DocStatus.ACTIVE)
    actor = FakeUser(role=Role.ADMIN)

    with pytest.raises(InvalidTransitionError):
        await service.transition(doc_machine, doc, DocStatus.ARCHIVED, actor=actor)


async def test_system_transition_takes_system_edge(service: StateMachineService, session: MagicMock) -> None:
    doc = FakeDoc(state=DocStatus.ACTIVE)

    await service.system_transition(doc_machine, doc, DocStatus.ARCHIVED)

    assert doc.state == DocStatus.ARCHIVED
    session.add.assert_called_once()
    log = session.add.call_args.args[0]
    assert log.from_state == DocStatus.ACTIVE.value
    assert log.to_state == DocStatus.ARCHIVED.value


async def test_system_transition_rejects_role_edge(service: StateMachineService) -> None:
    doc = FakeDoc(state=DocStatus.DRAFT)

    with pytest.raises(InvalidTransitionError):
        await service.system_transition(doc_machine, doc, DocStatus.ACTIVE)
