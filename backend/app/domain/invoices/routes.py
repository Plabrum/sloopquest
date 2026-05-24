from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.invoices.models import Invoice, InvoiceLineItem
from app.domain.invoices.schemas import InvoiceDetail, InvoiceLineItemSchema, InvoiceListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig


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
        identifier=invoice.identifier,
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
        identifier=invoice.identifier,
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
        stripe_payment_intent_id=invoice.stripe_payment_intent_id,
        stripe_client_secret=invoice.stripe_client_secret,
        access_token=invoice.access_token,
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
    sortable_columns={"identifier", "issued_at", "due_at", "total_cents", "created_at"},
    label_field="identifier",
    data_fields=[
        FieldConfig("total_cents", "Total", FieldType.CENTS),
        FieldConfig("subtotal_cents", "Subtotal", FieldType.CENTS),
        FieldConfig("tax_cents", "Tax", FieldType.CENTS),
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("issued_at", "Issued", FieldType.DATETIME, aggregatable=False, filterable=True),
        FieldConfig("due_at", "Due", FieldType.DATETIME, aggregatable=False, filterable=True),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_controller = make_crud_controller("", _config)

invoice_router = Router(path="/invoices", route_handlers=[_controller], tags=["invoices"])
