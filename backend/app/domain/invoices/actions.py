from __future__ import annotations

import logging
from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.invoices.enums import InvoiceState
from app.domain.invoices.models import Invoice, InvoiceLineItem
from app.domain.invoices.schemas import (
    AddLineItemData,
    CreateInvoiceData,
    RemoveLineItemData,
    UpdateInvoiceData,
    UpdateLineItemData,
)
from app.domain.invoices.state_machine import invoice_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse

logger = logging.getLogger(__name__)


class InvoiceActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SEND = auto()
    MARK_PAID = auto()
    VOID = auto()
    ADD_LINE_ITEM = auto()
    UPDATE_LINE_ITEM = auto()
    REMOVE_LINE_ITEM = auto()


invoice_actions = action_group_factory(
    group_type=ActionGroupType.INVOICE_ACTIONS,
    default_invalidation="list_Invoice",
    model_type=Invoice,
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
            invoice_number=data.invoice_number,
            due_at=data.due_at,
            notes=data.notes,
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
        obj.invoice_number = data.invoice_number
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
    async def execute(
        cls, obj: Invoice, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.sent, actor=deps.user)

        if obj.total_cents > 0:
            org = deps.organization
            if org.stripe_account_id:
                try:
                    obj.payment_link_url = await deps.billing.create_payment_link(
                        amount_cents=obj.total_cents,
                        currency=obj.currency,
                        connected_account_id=org.stripe_account_id,
                        invoice_id=str(obj.id),
                    )
                except Exception:
                    logger.exception("Failed to create payment link for invoice %s", obj.id)

        return ActionExecutionResponse(message="Invoice sent")


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
        await deps.sm_service.transition(invoice_state_machine, obj, InvoiceState.void, actor=deps.user)
        return ActionExecutionResponse(message="Invoice voided")


@invoice_actions
class AddLineItem(BaseObjectAction[Invoice, AddLineItemData]):
    action_key = InvoiceActionKey.ADD_LINE_ITEM
    label = "Add Line Item"
    icon = ActionIcon.ADD
    priority = 40

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.state == InvoiceState.draft

    @classmethod
    async def execute(
        cls, obj: Invoice, data: AddLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        item = InvoiceLineItem(
            invoice_id=obj.id,
            description=data.description,
            quantity=data.quantity,
            unit_price_cents=data.unit_price_cents,
            sort_order=data.sort_order,
        )
        transaction.add(item)
        await transaction.flush()
        await _recalculate_totals(obj, transaction)
        return ActionExecutionResponse(message="Line item added", created_id=item.id)


@invoice_actions
class UpdateLineItem(BaseObjectAction[Invoice, UpdateLineItemData]):
    action_key = InvoiceActionKey.UPDATE_LINE_ITEM
    label = "Edit Line Item"
    icon = ActionIcon.EDIT
    priority = 41
    is_hidden = True

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.state == InvoiceState.draft

    @classmethod
    async def execute(
        cls, obj: Invoice, data: UpdateLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(InvoiceLineItem).where(
                InvoiceLineItem.id == data.line_item_id,
                InvoiceLineItem.invoice_id == obj.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundException()
        item.description = data.description
        item.quantity = data.quantity
        item.unit_price_cents = data.unit_price_cents
        item.sort_order = data.sort_order
        await _recalculate_totals(obj, transaction)
        return ActionExecutionResponse(message="Line item updated")


@invoice_actions
class RemoveLineItem(BaseObjectAction[Invoice, RemoveLineItemData]):
    action_key = InvoiceActionKey.REMOVE_LINE_ITEM
    label = "Remove Line Item"
    icon = ActionIcon.TRASH
    priority = 42
    is_hidden = True
    confirmation_message = "Remove this line item?"

    @classmethod
    def is_available(cls, obj: Invoice, deps: ActionDeps) -> bool:
        return obj.state == InvoiceState.draft

    @classmethod
    async def execute(
        cls, obj: Invoice, data: RemoveLineItemData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(InvoiceLineItem).where(
                InvoiceLineItem.id == data.line_item_id,
                InvoiceLineItem.invoice_id == obj.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundException()
        await transaction.delete(item)
        await _recalculate_totals(obj, transaction)
        return ActionExecutionResponse(message="Line item removed")
