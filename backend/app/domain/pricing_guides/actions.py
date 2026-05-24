from __future__ import annotations

from decimal import Decimal
from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.pricing_guides.schemas import (
    AddPricingTierData,
    CreatePricingGuideData,
    RemovePricingTierData,
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
    ADD_TIER = auto()
    UPDATE_TIER = auto()
    REMOVE_TIER = auto()


pricing_guide_actions = action_group_factory(
    group_type=ActionGroupType.PRICING_GUIDE_ACTIONS,
    default_invalidation="/pricing-guides",
    model_type=PricingGuide,
)


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
        guide = PricingGuide(
            organization_id=deps.user.organization_id,
            user_id=deps.user.id,
            name=data.name,
            is_active=data.is_active,
        )
        transaction.add(guide)
        await transaction.flush()
        return ActionExecutionResponse(message="Pricing guide created", created_id=guide.id)


@pricing_guide_actions
class UpdatePricingGuide(BaseObjectAction[PricingGuide, UpdatePricingGuideData]):
    action_key = PricingGuideActionKey.UPDATE
    label = "Edit Pricing Guide"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: UpdatePricingGuideData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.is_active = data.is_active
        return ActionExecutionResponse(message="Pricing guide updated")


@pricing_guide_actions
class DeletePricingGuide(BaseObjectAction[PricingGuide, EmptyActionData]):
    action_key = PricingGuideActionKey.DELETE
    label = "Delete Pricing Guide"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this pricing guide?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Pricing guide deleted")


@pricing_guide_actions
class AddPricingTier(BaseObjectAction[PricingGuide, AddPricingTierData]):
    action_key = PricingGuideActionKey.ADD_TIER
    label = "Add Tier"
    icon = ActionIcon.ADD
    priority = 40

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: AddPricingTierData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        tier = PricingTier(
            guide_id=obj.id,
            service_type=data.service_type,
            length_min_ft=data.length_min_ft,
            length_max_ft=data.length_max_ft,
            pricing_type=data.pricing_type,
            amount_cents=data.amount_cents,
            sort_order=data.sort_order,
        )
        transaction.add(tier)
        await transaction.flush()
        return ActionExecutionResponse(message="Tier added", created_id=tier.id)


@pricing_guide_actions
class UpdatePricingTier(BaseObjectAction[PricingGuide, UpdatePricingTierData]):
    action_key = PricingGuideActionKey.UPDATE_TIER
    label = "Edit Tier"
    icon = ActionIcon.EDIT
    priority = 41
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: UpdatePricingTierData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(PricingTier).where(
                PricingTier.id == data.tier_id,
                PricingTier.guide_id == obj.id,
            )
        )
        tier = result.scalar_one_or_none()
        if tier is None:
            raise NotFoundException()
        tier.service_type = data.service_type
        tier.length_min_ft = Decimal(str(data.length_min_ft)) if data.length_min_ft is not None else None
        tier.length_max_ft = Decimal(str(data.length_max_ft)) if data.length_max_ft is not None else None
        tier.pricing_type = data.pricing_type
        tier.amount_cents = data.amount_cents
        tier.sort_order = data.sort_order
        return ActionExecutionResponse(message="Tier updated")


@pricing_guide_actions
class RemovePricingTier(BaseObjectAction[PricingGuide, RemovePricingTierData]):
    action_key = PricingGuideActionKey.REMOVE_TIER
    label = "Remove Tier"
    icon = ActionIcon.TRASH
    priority = 42
    is_hidden = True
    confirmation_message = "Remove this tier?"

    @classmethod
    async def execute(
        cls, obj: PricingGuide, data: RemovePricingTierData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(PricingTier).where(
                PricingTier.id == data.tier_id,
                PricingTier.guide_id == obj.id,
            )
        )
        tier = result.scalar_one_or_none()
        if tier is None:
            raise NotFoundException()
        await transaction.delete(tier)
        return ActionExecutionResponse(message="Tier removed")
