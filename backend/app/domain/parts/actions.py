from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.parts.models import Part
from app.domain.parts.schemas import PartCreateData, PartUpdateData
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class PartActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()


part_actions = action_group_factory(
    group_type=ActionGroupType.PART_ACTIONS,
    default_invalidation="/parts",
    model_type=Part,
)


@part_actions
class CreatePart(BaseTopLevelAction[PartCreateData]):
    action_key = PartActionKey.CREATE
    label = "Add Part"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: PartCreateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        part = Part(
            organization_id=deps.user.organization_id,
            name=data.name,
            part_number=data.part_number,
            description=data.description,
            category=data.category,
            manufacturer_id=data.manufacturer_id,
        )
        transaction.add(part)
        await transaction.flush()
        return ActionExecutionResponse(message="Part created", created_id=part.id)


@part_actions
class UpdatePart(BaseObjectAction[Part, PartUpdateData]):
    action_key = PartActionKey.UPDATE
    label = "Edit Part"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Part, data: PartUpdateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.part_number = data.part_number
        obj.description = data.description
        obj.category = data.category
        obj.manufacturer_id = data.manufacturer_id
        return ActionExecutionResponse(message="Part updated")


@part_actions
class DeletePart(BaseObjectAction[Part, EmptyActionData]):
    action_key = PartActionKey.DELETE
    label = "Delete Part"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this part?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: Part, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Part deleted")
