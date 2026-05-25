from __future__ import annotations

import logging
import secrets
from enum import StrEnum, auto

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.clients.models import Client
from app.domain.invoices.enums import InvoiceState
from app.domain.invoices.models import Invoice, InvoiceLineItem
from app.domain.invoices.schemas import (
    AddLineItemData,
    CreateInvoiceData,
    UpdateInvoiceData,
    UpdateLineItemData,
)
from app.domain.invoices.state_machine import invoice_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import (
    ActionCTA,
    ActionExecutionResponse,
    CopyToClipboardActionResult,
    DisabledReason,
)
from app.platform.sequences.service import assign_identifier_if_missing

logger = logging.getLogger(__name__)


class InvoiceActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SEND = auto()
    MARK_PAID = auto()
    VOID = auto()
    REFUND = auto()
    COPY_PAY_LINK = auto()


class InvoiceLineItemActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    REMOVE = auto()


invoice_actions = action_group_factory(
    group_type=ActionGroupType.INVOICE_ACTIONS,
    default_invalidation="/invoices",
    model_type=Invoice,
)

invoice_line_item_actions = action_group_factory(
    group_type=ActionGroupType.INVOICE_LINE_ITEM_ACTIONS,
    default_invalidation="/invoice-line-items",
    model_type=InvoiceLineItem,
)


async def _recalculate_totals(invoice: Invoice, transaction: AsyncSession) -> None:
    result = await transaction.execute(select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id))
    items = result.scalars().all()
    subtotal = sum(round(item.quantity * item.unit_price_cents) for item in items)
    invoice.subtotal_cents = int(subtotal)
    invoice.total_cents = invoice.subtotal_cents + invoice.tax_cents


@invoice_actions
class CreateInvoice(BaseTopLevelAction[CreateInvoiceData]):
    action_key = InvoiceActionKey.CREATE
    label = "Create Invoice"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
        "client_id": {"model": "Client", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, data: CreateInvoiceData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        invoice = Invoice(
            organization_id=deps.user.organization_id,
            survey_id=data.survey_id,
            client_id=data.client_id,
            due_at=data.due_at,
            notes=data.notes,
            access_token=secrets.token_urlsafe(32),
        )
        transaction.add(invoice)
        await transaction.flush()
        return ActionExecutionResponse(message="Invoice created", created_id=invoice.id)


@invoice_actions
class UpdateInvoice(BaseObjectAction[Invoice, UpdateInvoiceData]):
    action_key = InvoiceActionKey.UPDATE
    label = "Edit Invoice"
    icon = ActionIcon.EDIT
    priority = 20
    form_entity_fields = {
        "client_id": {"model": "Client", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, obj: Invoice, data: UpdateInvoiceData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.client_id = data.client_id
        obj.issued_at = data.issued_at
        obj.due_at = data.due_at
        obj.currency = data.currency
        obj.tax_cents = data.tax_cents
        obj.notes = data.notes
        obj.total_cents = obj.subtotal_cents + obj.tax_cents
        return ActionExecutionResponse(message="Invoice updated")


@invoice_actions
class DeleteInvoice(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.DELETE
    label = "Delete Invoice"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this invoice?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.state == InvoiceState.draft

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Invoice deleted")


@invoice_actions
class SendInvoice(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.SEND
    label = "Send Invoice"
    icon = ActionIcon.SEND
    priority = 30

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return invoice_state_machine.can_transition(obj, InvoiceState.sent, deps.user.role)

    @classmethod
    def is_disabled(cls, obj: Invoice, deps: ActionDeps) -> DisabledReason | None:
        if obj.total_cents > 0 and deps.organization.stripe_account_id is None:
            return DisabledReason(
                message="Connect a Stripe account to accept payments on this invoice.",
                cta=ActionCTA(label="Set up payments", path="/settings/billing"),
            )
        return None

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if obj.access_token is None:
            obj.access_token = secrets.token_urlsafe(32)
        await assign_identifier_if_missing(transaction, obj)
        if (
            obj.stripe_payment_intent_id is None
            and obj.total_cents > 0
            and deps.organization.stripe_account_id is not None
        ):
            pi_id, client_secret = await deps.billing.create_payment_intent(
                amount_cents=obj.total_cents,
                currency=obj.currency,
                connected_account_id=deps.organization.stripe_account_id,
                invoice_id=str(obj.id),
            )
            obj.stripe_payment_intent_id = pi_id
            obj.stripe_client_secret = client_secret
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.sent, actor=deps.user)

        client = (await transaction.execute(select(Client).where(Client.id == obj.client_id))).scalar_one_or_none()
        if client is not None and client.email:
            pay_url = f"{config.FRONTEND_ORIGIN.rstrip('/')}/pay/{obj.access_token}"
            total_display = f"${obj.total_cents / 100:,.2f}"
            due_at_display = obj.due_at.strftime("%B %-d, %Y") if obj.due_at else None
            await deps.email.send_invoice_email(
                user_id=deps.user.id,
                to_email=client.email,
                pay_url=pay_url,
                invoice_number=obj.identifier,
                organization_name=deps.organization.name,
                total_display=total_display,
                due_at_display=due_at_display,
                reply_to=deps.user.email,
            )
        return ActionExecutionResponse(message="Invoice sent")


@invoice_actions
class CopyPayLink(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.COPY_PAY_LINK
    label = "Copy pay link"
    icon = ActionIcon.LINK
    priority = 32

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.access_token is not None

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        assert obj.access_token is not None
        pay_url = f"{config.FRONTEND_ORIGIN.rstrip('/')}/pay/{obj.access_token}"
        return ActionExecutionResponse(
            message="",
            action_result=CopyToClipboardActionResult(text=pay_url, toast="Pay link copied"),
        )


@invoice_actions
class MarkInvoicePaid(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.MARK_PAID
    label = "Mark as Paid"
    icon = ActionIcon.CHECK
    priority = 31

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return invoice_state_machine.can_transition(obj, InvoiceState.paid, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.paid, actor=deps.user)
        return ActionExecutionResponse(message="Invoice marked as paid")


@invoice_actions
class VoidInvoice(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.VOID
    label = "Void Invoice"
    icon = ActionIcon.X
    priority = 85
    confirmation_message = "Void this invoice? This cannot be undone."

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return invoice_state_machine.can_transition(obj, InvoiceState.void, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if obj.stripe_payment_intent_id is not None and obj.state != InvoiceState.paid:
            await deps.billing.cancel_payment_intent(obj.stripe_payment_intent_id)
            obj.stripe_client_secret = None
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.void, actor=deps.user)
        return ActionExecutionResponse(message="Invoice voided")


@invoice_actions
class Refund(BaseObjectAction[Invoice, EmptyActionData]):
    action_key = InvoiceActionKey.REFUND
    label = "Refund"
    icon = ActionIcon.X
    priority = 86
    confirmation_message = "Refund this invoice? This cannot be undone."

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.state == InvoiceState.paid and obj.stripe_payment_intent_id is not None

    @classmethod
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        assert obj.stripe_payment_intent_id is not None
        assert deps.organization.stripe_account_id is not None
        await deps.billing.refund_payment_intent(
            payment_intent_id=obj.stripe_payment_intent_id,
            connected_account_id=deps.organization.stripe_account_id,
        )
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.refunded, actor=deps.user)
        return ActionExecutionResponse(message="Invoice refunded")


async def _recalculate_invoice_totals_by_id(invoice_id: int, transaction: AsyncSession) -> None:
    invoice = await transaction.get(Invoice, invoice_id)
    if invoice is None:
        return
    await _recalculate_totals(invoice, transaction)


@invoice_line_item_actions
class AddLineItem(BaseTopLevelAction[AddLineItemData]):
    action_key = InvoiceLineItemActionKey.CREATE
    label = "Add Line Item"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: AddLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        invoice = await transaction.get(Invoice, data.invoice_id)
        if invoice is None or invoice.state != InvoiceState.draft:
            return ActionExecutionResponse(message="Cannot add line item")
        item = InvoiceLineItem(
            organization_id=deps.user.organization_id,
            invoice_id=data.invoice_id,
            description=data.description,
            quantity=data.quantity,
            unit_price_cents=data.unit_price_cents,
            sort_order=data.sort_order,
        )
        transaction.add(item)
        await transaction.flush()
        await _recalculate_totals(invoice, transaction)
        return ActionExecutionResponse(message="Line item added", created_id=item.id)


@invoice_line_item_actions
class UpdateLineItem(BaseObjectAction[InvoiceLineItem, UpdateLineItemData]):
    action_key = InvoiceLineItemActionKey.UPDATE
    label = "Edit Line Item"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: InvoiceLineItem, data: UpdateLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.description = data.description
        obj.quantity = data.quantity
        obj.unit_price_cents = data.unit_price_cents
        obj.sort_order = data.sort_order
        await transaction.flush()
        await _recalculate_invoice_totals_by_id(obj.invoice_id, transaction)
        return ActionExecutionResponse(message="Line item updated")


@invoice_line_item_actions
class RemoveLineItem(BaseObjectAction[InvoiceLineItem, EmptyActionData]):
    action_key = InvoiceLineItemActionKey.REMOVE
    label = "Remove Line Item"
    icon = ActionIcon.TRASH
    priority = 30
    confirmation_message = "Remove this line item?"

    @classmethod
    async def execute(
        cls, obj: InvoiceLineItem, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        invoice_id = obj.invoice_id
        await transaction.delete(obj)
        await transaction.flush()
        await _recalculate_invoice_totals_by_id(invoice_id, transaction)
        return ActionExecutionResponse(message="Line item removed")
