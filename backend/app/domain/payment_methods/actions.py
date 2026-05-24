from __future__ import annotations

from enum import StrEnum, auto

import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.payment_methods.models import PaymentMethod
from app.domain.payment_methods.schemas import AttachPaymentMethodData
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class PaymentMethodActionKey(StrEnum):
    ATTACH_PAYMENT_METHOD = auto()
    SET_DEFAULT = auto()
    REMOVE = auto()


payment_method_actions = action_group_factory(
    group_type=ActionGroupType.PAYMENT_METHOD_ACTIONS,
    default_invalidation="/payment-methods",
    model_type=PaymentMethod,
)


@payment_method_actions
class AttachPaymentMethod(BaseTopLevelAction[AttachPaymentMethodData]):
    action_key = PaymentMethodActionKey.ATTACH_PAYMENT_METHOD
    label = "Attach Payment Method"
    icon = ActionIcon.ADD
    priority = 11
    is_hidden = True

    @classmethod
    async def execute(
        cls, data: AttachPaymentMethodData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        pm_data = await deps.billing.retrieve_payment_method(data.payment_method_id)

        existing_count_result = await transaction.execute(
            select(sa.func.count())
            .select_from(PaymentMethod)
            .where(
                PaymentMethod.organization_id == deps.user.organization_id,
                PaymentMethod.deleted_at.is_(None),
            )
        )
        existing_count = existing_count_result.scalar() or 0
        is_default = existing_count == 0

        pm = PaymentMethod(
            organization_id=deps.user.organization_id,
            stripe_payment_method_id=data.payment_method_id,
            brand=pm_data.get("brand", ""),
            last4=pm_data.get("last4", ""),
            exp_month=pm_data.get("exp_month", 0),
            exp_year=pm_data.get("exp_year", 0),
            is_default=is_default,
        )
        transaction.add(pm)
        await transaction.flush()
        return ActionExecutionResponse(message="Payment method attached", created_id=pm.id)


@payment_method_actions
class SetDefaultPaymentMethod(BaseObjectAction[PaymentMethod, EmptyActionData]):
    action_key = PaymentMethodActionKey.SET_DEFAULT
    label = "Set as Default"
    icon = ActionIcon.CHECK
    priority = 10

    @classmethod
    def is_available(cls, obj: PaymentMethod, deps: ActionDeps) -> bool:
        return not obj.is_default

    @classmethod
    async def execute(
        cls, obj: PaymentMethod, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await transaction.execute(
            sa.update(PaymentMethod)
            .where(
                PaymentMethod.organization_id == obj.organization_id,
                PaymentMethod.id != obj.id,
            )
            .values(is_default=False)
        )
        obj.is_default = True
        assert deps.organization.stripe_customer_id is not None
        await deps.billing.set_default_payment_method(
            customer_id=deps.organization.stripe_customer_id,
            payment_method_id=obj.stripe_payment_method_id,
        )
        return ActionExecutionResponse(message="Default payment method updated")


@payment_method_actions
class RemovePaymentMethod(BaseObjectAction[PaymentMethod, EmptyActionData]):
    action_key = PaymentMethodActionKey.REMOVE
    label = "Remove"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Remove this payment method?"

    @classmethod
    def is_available(cls, obj: PaymentMethod, deps: ActionDeps) -> bool:
        return not obj.is_default

    @classmethod
    async def execute(
        cls, obj: PaymentMethod, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.billing.detach_payment_method(obj.stripe_payment_method_id)
        obj.soft_delete()
        return ActionExecutionResponse(message="Payment method removed")
