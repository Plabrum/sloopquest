from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.users.models import Organization, User
from app.domain.users.service import UserService
from app.platform.actions.base import (
    BaseObjectAction,
    BaseTopLevelAction,
    EmptyActionData,
    action_group_factory,
)
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse, RedirectActionResult
from app.platform.base.schemas import BaseSchema


class OrganizationActionKey(StrEnum):
    START_CONNECT_ONBOARDING = auto()


class UserActionKey(StrEnum):
    CLAIM_INBOX = auto()


organization_actions = action_group_factory(
    group_type=ActionGroupType.ORGANIZATION_ACTIONS,
    model_type=Organization,
)


user_actions = action_group_factory(
    group_type=ActionGroupType.USER_ACTIONS,
    model_type=User,
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
            account_id = await deps.billing.create_connected_account(name=org.name, email=deps.user.email)
            merged_org = await transaction.merge(org)
            merged_org.stripe_account_id = account_id
        else:
            account_id = org.stripe_account_id

        return_url = f"{deps.config.FRONTEND_ORIGIN}/settings/billing?onboarding=complete"
        refresh_url = f"{deps.config.FRONTEND_ORIGIN}/settings/billing?onboarding=refresh"

        account_link_url = await deps.billing.create_account_link(
            stripe_account_id=account_id,
            return_url=return_url,
            refresh_url=refresh_url,
        )

        return ActionExecutionResponse(
            message="Redirecting to Stripe onboarding",
            action_result=RedirectActionResult(path=account_link_url),
        )


class ClaimInboxData(BaseSchema):
    local_part: str


@user_actions
class ClaimInbox(BaseObjectAction[User, ClaimInboxData]):
    action_key = UserActionKey.CLAIM_INBOX
    label = "Claim Inbox"
    icon = ActionIcon.ADD
    priority = 10
    form_field_labels = {"local_part": "Inbox name"}
    form_field_placeholders = {"local_part": "phil"}

    @classmethod
    def is_available(cls, obj: User, deps: ActionDeps) -> bool:
        # Self-service only: User has no RLS, so the action gate is the
        # authorization boundary — never let one user claim another's inbox.
        return obj.id == deps.user.id and obj.inbox_local_part is None

    @classmethod
    async def execute(
        cls, obj: User, data: ClaimInboxData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        canonical = await UserService(transaction).claim_inbox_local_part(int(obj.id), data.local_part)
        domain = config.SES_FROM_EMAIL.rsplit("@", 1)[-1]
        return ActionExecutionResponse(message=f"Inbox claimed: {canonical}@{domain}")
