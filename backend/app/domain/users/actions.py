from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import Organization
from app.platform.actions.base import BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse, RedirectActionResult


class OrganizationActionKey(StrEnum):
    START_CONNECT_ONBOARDING = auto()


organization_actions = action_group_factory(
    group_type=ActionGroupType.ORGANIZATION_ACTIONS,
    model_type=Organization,
)


@organization_actions
class StartConnectOnboarding(BaseTopLevelAction[EmptyActionData]):
    action_key = OrganizationActionKey.START_CONNECT_ONBOARDING
    label = "Connect Stripe Account"
    icon = ActionIcon.DEFAULT
    priority = 10

    @classmethod
    async def execute(
        cls, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        org = deps.organization

        if not org.stripe_account_id:
            org.stripe_account_id = await deps.billing.create_connected_account(name=org.name, email=deps.user.email)

        return_url = f"{deps.config.FRONTEND_ORIGIN}/settings/billing?onboarding=complete"
        refresh_url = f"{deps.config.FRONTEND_ORIGIN}/settings/billing?onboarding=refresh"

        account_link_url = await deps.billing.create_account_link(
            stripe_account_id=org.stripe_account_id,
            return_url=return_url,
            refresh_url=refresh_url,
        )

        return ActionExecutionResponse(
            message="Redirecting to Stripe onboarding",
            action_result=RedirectActionResult(path=account_link_url),
        )
