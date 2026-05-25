from __future__ import annotations

import logging
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.onboarding.enums import OnboardingState
from app.domain.onboarding.models import Onboarding
from app.domain.onboarding.schemas import ClaimInboxData, ConfirmPricingData
from app.domain.onboarding.state_machine import onboarding_state_machine
from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.users.service import UserService
from app.platform.actions.base import BaseTopLevelAction, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse

logger = logging.getLogger(__name__)


class OnboardingActionKey(StrEnum):
    CLAIM_INBOX = auto()
    CONFIRM_PRICING = auto()


onboarding_actions = action_group_factory(
    group_type=ActionGroupType.ONBOARDING_ACTIONS,
    default_invalidation="/onboardings",
)


@onboarding_actions
class ClaimInbox(BaseTopLevelAction[ClaimInboxData]):
    action_key = OnboardingActionKey.CLAIM_INBOX
    label = "Claim Inbox"
    icon = ActionIcon.ADD
    priority = 10
    form_field_labels = {"local_part": "Inbox name"}
    form_field_placeholders = {"local_part": "phil"}

    @classmethod
    async def execute(
        cls, data: ClaimInboxData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        row = (
            await transaction.execute(select(Onboarding).where(Onboarding.user_id == deps.user.id))
        ).scalar_one_or_none()
        if row is None:
            raise NotFoundException(detail="Onboarding row not found")

        now = datetime.now(tz=UTC)
        if row.state == OnboardingState.NOT_STARTED:
            row.started_at = now
            await deps.sm_service.system_transition(onboarding_state_machine, row, OnboardingState.INBOX)

        await UserService(transaction).claim_inbox_local_part(int(deps.user.id), data.local_part)

        await deps.sm_service.transition(onboarding_state_machine, row, OnboardingState.PRICING, actor=deps.user)

        return ActionExecutionResponse(
            message="Inbox claimed",
            invalidate_queries=["/onboardings", "/auth/me"],
        )


@onboarding_actions
class ConfirmPricing(BaseTopLevelAction[ConfirmPricingData]):
    action_key = OnboardingActionKey.CONFIRM_PRICING
    label = "Confirm Pricing"
    icon = ActionIcon.CHECK
    priority = 20

    @classmethod
    async def execute(
        cls, data: ConfirmPricingData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        row = (
            await transaction.execute(select(Onboarding).where(Onboarding.user_id == deps.user.id))
        ).scalar_one_or_none()
        if row is None:
            raise NotFoundException(detail="Onboarding row not found")

        guide = (
            await transaction.execute(
                select(PricingGuide).where(PricingGuide.user_id == deps.user.id, PricingGuide.is_active.is_(True))
            )
        ).scalar_one_or_none()
        if guide is None:
            raise NotFoundException(detail="Active pricing guide not found")

        if not data.tiers:
            raise NotFoundException(detail="At least one pricing tier is required")

        guide.service_type = data.service_type

        existing = (
            (await transaction.execute(select(PricingTier).where(PricingTier.guide_id == guide.id))).scalars().all()
        )
        for old in existing:
            await transaction.delete(old)
        await transaction.flush()

        for t in data.tiers:
            transaction.add(
                PricingTier(
                    organization_id=guide.organization_id,
                    guide_id=guide.id,
                    length_until_ft=Decimal(str(t.length_until_ft)) if t.length_until_ft is not None else None,
                    pricing_type=t.pricing_type,
                    amount_cents=t.amount_cents,
                )
            )

        await deps.sm_service.transition(onboarding_state_machine, row, OnboardingState.COMPLETED, actor=deps.user)
        row.completed_at = datetime.now(tz=UTC)

        return ActionExecutionResponse(
            message="Pricing confirmed",
            invalidate_queries=["/onboardings", "/pricing-guides", "/auth/me"],
        )
