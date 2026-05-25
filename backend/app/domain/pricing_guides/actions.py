from __future__ import annotations

from decimal import Decimal
from enum import StrEnum, auto

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.pricing_guides.enums import ServiceType
from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.pricing_guides.schemas import (
    AddPricingTierData,
    CreatePricingGuideData,
    UpdatePricingGuideData,
    UpdatePricingTierData,
)
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class PricingGuideActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SET_ACTIVE = auto()


class PricingTierActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    REMOVE = auto()


pricing_guide_actions = action_group_factory(
    group_type=ActionGroupType.PRICING_GUIDE_ACTIONS,
    default_invalidation="/pricing-guides",
    model_type=PricingGuide,
)

pricing_tier_actions = action_group_factory(
    group_type=ActionGroupType.PRICING_TIER_ACTIONS,
    default_invalidation="/pricing-tiers",
    model_type=PricingTier,
)


async def _deactivate_other_guides(
    transaction: AsyncSession,
    user_id: int,
    service_type: ServiceType,
    except_id: int | None,
) -> None:
    stmt = update(PricingGuide).where(
        PricingGuide.user_id == user_id,
        PricingGuide.service_type == service_type,
        PricingGuide.is_active.is_(True),
    )
    if except_id is not None:
        stmt = stmt.where(PricingGuide.id != except_id)
    await transaction.execute(stmt.values(is_active=False))


@pricing_guide_actions
class CreatePricingGuide(BaseTopLevelAction[CreatePricingGuideData]):
    action_key = PricingGuideActionKey.CREATE
    label = "Create Pricing Guide"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: CreatePricingGuideData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        existing_active = await transaction.scalar(
            select(PricingGuide.id).where(
                PricingGuide.user_id == deps.user.id,
                PricingGuide.service_type == data.service_type,
                PricingGuide.is_active.is_(True),
            )
        )
        guide = PricingGuide(
            organization_id=deps.user.organization_id,
            user_id=deps.user.id,
            name=data.name,
            service_type=data.service_type,
            is_active=existing_active is None,
        )
        transaction.add(guide)
        await transaction.flush()
        return ActionExecutionResponse(message="Pricing guide created", created_id=guide.id)


@pricing_guide_actions
class UpdatePricingGuide(BaseObjectAction[PricingGuide, UpdatePricingGuideData]):
    action_key = PricingGuideActionKey.UPDATE
    label = "Rename"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: UpdatePricingGuideData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        if obj.service_type != data.service_type and obj.is_active:
            await _deactivate_other_guides(
                transaction,
                user_id=int(obj.user_id),
                service_type=data.service_type,
                except_id=obj.id,
            )
        obj.service_type = data.service_type
        return ActionExecutionResponse(message="Pricing guide updated")


@pricing_guide_actions
class SetActivePricingGuide(BaseObjectAction[PricingGuide, EmptyActionData]):
    action_key = PricingGuideActionKey.SET_ACTIVE
    label = "Set as Active"
    icon = ActionIcon.CHECK
    priority = 15

    @classmethod
    def is_available(cls, obj: PricingGuide, deps: ActionDeps) -> bool:
        return not obj.is_active and obj.user_id == deps.user.id

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await _deactivate_other_guides(
            transaction,
            user_id=int(obj.user_id),
            service_type=obj.service_type,
            except_id=obj.id,
        )
        obj.is_active = True
        return ActionExecutionResponse(message="Pricing guide activated")


@pricing_guide_actions
class DeletePricingGuide(BaseObjectAction[PricingGuide, EmptyActionData]):
    action_key = PricingGuideActionKey.DELETE
    label = "Delete Pricing Guide"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this pricing guide?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: PricingGuide, deps: ActionDeps) -> bool:
        return not obj.is_active

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Pricing guide deleted")


@pricing_tier_actions
class AddPricingTier(BaseTopLevelAction[AddPricingTierData]):
    action_key = PricingTierActionKey.CREATE
    label = "Add Tier"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: AddPricingTierData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        tier = PricingTier(
            organization_id=deps.user.organization_id,
            guide_id=data.guide_id,
            length_until_ft=Decimal(str(data.length_until_ft)) if data.length_until_ft is not None else None,
            pricing_type=data.pricing_type,
            amount_cents=data.amount_cents,
        )
        transaction.add(tier)
        await transaction.flush()
        return ActionExecutionResponse(message="Tier added", created_id=tier.id)


@pricing_tier_actions
class UpdatePricingTier(BaseObjectAction[PricingTier, UpdatePricingTierData]):
    action_key = PricingTierActionKey.UPDATE
    label = "Edit Tier"
    icon = ActionIcon.EDIT
    priority = 10

    @classmethod
    async def execute(
        cls, obj: PricingTier, data: UpdatePricingTierData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.length_until_ft = Decimal(str(data.length_until_ft)) if data.length_until_ft is not None else None
        obj.pricing_type = data.pricing_type
        obj.amount_cents = data.amount_cents
        return ActionExecutionResponse(message="Tier updated")


@pricing_tier_actions
class RemovePricingTier(BaseObjectAction[PricingTier, EmptyActionData]):
    action_key = PricingTierActionKey.REMOVE
    label = "Remove Tier"
    icon = ActionIcon.TRASH
    priority = 20
    confirmation_message = "Remove this tier?"

    @classmethod
    async def execute(
        cls, obj: PricingTier, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await transaction.delete(obj)
        return ActionExecutionResponse(message="Tier removed")
