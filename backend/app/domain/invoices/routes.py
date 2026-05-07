from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.invoices.models import Invoice, InvoiceLineItem
from app.domain.invoices.schemas import InvoiceDetail, InvoiceLineItemSchema, InvoiceListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_line_item(item: InvoiceLineItem) -> InvoiceLineItemSchema:
    return InvoiceLineItemSchema(
        id=item.id,
        description=item.description,
        quantity=item.quantity,
        unit_price_cents=item.unit_price_cents,
        sort_order=item.sort_order,
        created_at=item.created_at,
    )


def _to_list_item(invoice: Invoice, user: User) -> InvoiceListItem:
    return InvoiceListItem(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        state=invoice.state,
        survey_id=invoice.survey_id,
        client_id=invoice.client_id,
        issued_at=invoice.issued_at,
        due_at=invoice.due_at,
        total_cents=invoice.total_cents,
        created_at=invoice.created_at,
    )


def _to_detail(invoice: Invoice, user: User) -> InvoiceDetail:
    return InvoiceDetail(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        state=invoice.state,
        survey_id=invoice.survey_id,
        client_id=invoice.client_id,
        issued_at=invoice.issued_at,
        due_at=invoice.due_at,
        currency=invoice.currency,
        subtotal_cents=invoice.subtotal_cents,
        tax_cents=invoice.tax_cents,
        total_cents=invoice.total_cents,
        notes=invoice.notes,
        line_items=[_to_line_item(li) for li in invoice.line_items],
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
    )


_config = CRUDConfig(
    model=Invoice,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    detail_load_options=[selectinload(Invoice.line_items)],
    filterable_columns={"state", "survey_id", "client_id", "issued_at", "due_at", "created_at"},
    sortable_columns={"invoice_number", "issued_at", "due_at", "total_cents", "created_at"},
    label_field="invoice_number",
)

_controller = make_crud_controller("/invoices", _config)

invoice_router = Router(path="/invoices", route_handlers=[_controller], tags=["invoices"])
