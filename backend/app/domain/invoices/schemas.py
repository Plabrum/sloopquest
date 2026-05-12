from datetime import datetime
from decimal import Decimal

from app.domain.invoices.enums import InvoiceState
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class InvoiceLineItemSchema(BaseSchema):
    id: Sqid
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int
    created_at: datetime


class InvoiceListItem(BaseSchema):
    id: Sqid
    identifier: str | None
    state: InvoiceState
    survey_id: Sqid
    client_id: Sqid
    issued_at: datetime | None
    due_at: datetime | None
    total_cents: int
    created_at: datetime


class InvoiceDetail(BaseSchema):
    id: Sqid
    identifier: str | None
    state: InvoiceState
    survey_id: Sqid
    client_id: Sqid
    issued_at: datetime | None
    due_at: datetime | None
    currency: str
    subtotal_cents: int
    tax_cents: int
    total_cents: int
    notes: str | None
    stripe_payment_intent_id: str | None
    stripe_client_secret: str | None
    access_token: str | None
    line_items: list[InvoiceLineItemSchema]
    created_at: datetime
    updated_at: datetime


class PublicInvoiceLineItem(BaseSchema):
    description: str
    quantity: Decimal
    unit_price_cents: int


class PublicInvoiceDetail(BaseSchema):
    id: Sqid
    state: InvoiceState
    identifier: str | None
    currency: str
    subtotal_cents: int
    tax_cents: int
    total_cents: int
    issued_at: datetime | None
    due_at: datetime | None
    organization_name: str
    stripe_connected_account_id: str | None
    stripe_client_secret: str | None
    line_items: list[PublicInvoiceLineItem]


class CreateInvoiceData(BaseSchema):
    survey_id: Sqid
    client_id: Sqid
    due_at: datetime | None = None
    notes: str | None = None


class UpdateInvoiceData(BaseSchema):
    client_id: Sqid
    issued_at: datetime | None
    due_at: datetime | None
    currency: str
    tax_cents: int
    notes: str | None


class AddLineItemData(BaseSchema):
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int = 0


class UpdateLineItemData(BaseSchema):
    line_item_id: Sqid
    description: str
    quantity: Decimal
    unit_price_cents: int
    sort_order: int


class RemoveLineItemData(BaseSchema):
    line_item_id: Sqid
