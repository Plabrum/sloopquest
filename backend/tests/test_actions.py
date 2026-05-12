"""Unit tests for the actions framework."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from litestar.exceptions import PermissionDeniedException
from msgspec import Struct

from app.platform.actions.base import (
    ActionGroup,
    BaseAction,
    BaseObjectAction,
)
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType
from app.platform.actions.registry import ActionRegistry
from app.platform.actions.schemas import (
    ActionExecutionResponse,
    build_action_metadata,
    build_action_union,
)
from app.utils.sqids import Sqid


class FakeModel:
    """Stand-in for a BaseDBModel; the framework only needs `.id`."""

    def __init__(self, id: int = 1, archived: bool = False) -> None:
        self.id = id
        self.archived = archived


class ArchiveData(Struct):
    reason: str


def _make_action_group(model_cls: type, allow: bool = True) -> tuple[ActionGroup, type[BaseAction]]:
    """Build a fresh ActionGroup wired to a fresh registry instance.

    Resets the BaseRegistry singleton so each test gets a clean slate.
    """
    ActionRegistry._instance = None
    registry = ActionRegistry()
    group = ActionGroup(
        group_type=ActionGroupType.TEST_ACTIONS,
        action_registry=registry,
        model_type=model_cls,  # type: ignore[arg-type]
    )
    registry.register(ActionGroupType.TEST_ACTIONS, group)

    @group
    class ArchiveAction(BaseObjectAction):
        action_key = "archive"  # type: ignore[assignment]
        label = "Archive"

        @classmethod
        def is_available(cls, obj, deps) -> bool:  # type: ignore[override]
            return allow

        @classmethod
        async def execute(cls, obj, data: ArchiveData, transaction, deps):  # type: ignore[override]
            obj.archived = True
            return ActionExecutionResponse(message=f"archived: {data.reason}")

    return group, ArchiveAction


def _make_deps() -> ActionDeps:
    return ActionDeps(
        user=MagicMock(id=1),
        organization=MagicMock(),
        request=MagicMock(),
        transaction=AsyncMock(),
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=MagicMock(),
        billing=MagicMock(),
        email=MagicMock(),
    )


async def test_trigger_executes_action() -> None:
    group, archive_action = _make_action_group(FakeModel)

    deps = _make_deps()
    obj = FakeModel(id=42)
    group.get_object = AsyncMock(return_value=obj)  # type: ignore[method-assign]

    build_action_union(group.action_registry)
    struct_cls = next(s for s, a in group.action_registry._struct_to_action.items() if a is archive_action)
    data = struct_cls(data=ArchiveData(reason="dup"))

    result = await group.trigger(data=data, deps=deps, object_id=Sqid(42))

    assert obj.archived is True
    assert result.message == "archived: dup"


async def test_is_available_false_blocks_execution() -> None:
    group, archive_action = _make_action_group(FakeModel, allow=False)

    deps = _make_deps()
    obj = FakeModel(id=42)
    group.get_object = AsyncMock(return_value=obj)  # type: ignore[method-assign]

    build_action_union(group.action_registry)
    struct_cls = next(s for s, a in group.action_registry._struct_to_action.items() if a is archive_action)
    data = struct_cls(data=ArchiveData(reason="nope"))

    with pytest.raises(PermissionDeniedException):
        await group.trigger(data=data, deps=deps, object_id=Sqid(42))

    assert obj.archived is False


async def test_action_metadata_describes_fields() -> None:
    _make_action_group(FakeModel)

    metadata = build_action_metadata(ActionRegistry())

    # Combined key is "<group>__<action_key>"
    expected_key = f"{ActionGroupType.TEST_ACTIONS.value}__archive"
    assert expected_key in metadata
    entry = metadata[expected_key]
    assert entry["label"] == "Archive"
    assert entry["has_form"] is True
    assert entry["schema_name"] == "ArchiveData"
    assert "reason" in entry["fields"]
    assert entry["fields"]["reason"]["type"] == "string"
    assert entry["fields"]["reason"]["required"] is True
