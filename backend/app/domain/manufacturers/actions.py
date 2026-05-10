from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.manufacturers.models import Manufacturer
from app.domain.manufacturers.schemas import ManufacturerCreateData, ManufacturerUpdateData
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class ManufacturerActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()


manufacturer_actions = action_group_factory(
    group_type=ActionGroupType.MANUFACTURER_ACTIONS,
    default_invalidation="list_Manufacturer",
    model_type=Manufacturer,
)


@manufacturer_actions
class CreateManufacturer(BaseTopLevelAction[ManufacturerCreateData]):
    action_key = ManufacturerActionKey.CREATE
    label = "Add Manufacturer"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: ManufacturerCreateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        manufacturer = Manufacturer(
            organization_id=deps.user.organization_id,
            name=data.name,
            country=data.country,
            website=data.website,
        )
        transaction.add(manufacturer)
        await transaction.flush()
        return ActionExecutionResponse(message="Manufacturer created", created_id=manufacturer.id)


@manufacturer_actions
class UpdateManufacturer(BaseObjectAction[Manufacturer, ManufacturerUpdateData]):
    action_key = ManufacturerActionKey.UPDATE
    label = "Edit Manufacturer"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Manufacturer, data: ManufacturerUpdateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.country = data.country
        obj.website = data.website
        return ActionExecutionResponse(message="Manufacturer updated")


@manufacturer_actions
class DeleteManufacturer(BaseObjectAction[Manufacturer, EmptyActionData]):
    action_key = ManufacturerActionKey.DELETE
    label = "Delete Manufacturer"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this manufacturer?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: Manufacturer, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Manufacturer deleted")
