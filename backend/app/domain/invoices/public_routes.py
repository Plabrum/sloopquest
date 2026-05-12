from __future__ import annotations

from litestar import Router, get
from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.invoices.enums import InvoiceState
from app.domain.invoices.models import Invoice
from app.domain.invoices.schemas import PublicInvoiceDetail, PublicInvoiceLineItem
from app.domain.users.models import Organization


@get("/public/invoices/{access_token:str}", exclude_from_auth=True)
async def get_public_invoice(access_token: str, db_session: AsyncSession) -> PublicInvoiceDetail:
    if not access_token:
        raise NotFoundException()
    result = await db_session.execute(
        select(Invoice, Organization)
        .join(Organization, Organization.id == Invoice.organization_id)
        .where(Invoice.access_token == access_token, Invoice.deleted_at.is_(None))
        .options(selectinload(Invoice.line_items))
    )
    row = result.first()
    if row is None:
        raise NotFoundException()
    invoice, organization = row

    client_secret = invoice.stripe_client_secret if invoice.state == InvoiceState.sent else None

    return PublicInvoiceDetail(
        id=invoice.id,
        state=invoice.state,
        identifier=invoice.identifier,
        currency=invoice.currency,
        subtotal_cents=invoice.subtotal_cents,
        tax_cents=invoice.tax_cents,
        total_cents=invoice.total_cents,
        issued_at=invoice.issued_at,
        due_at=invoice.due_at,
        organization_name=organization.name,
        stripe_connected_account_id=organization.stripe_account_id,
        stripe_client_secret=client_secret,
        line_items=[
            PublicInvoiceLineItem(
                description=li.description,
                quantity=li.quantity,
                unit_price_cents=li.unit_price_cents,
            )
            for li in invoice.line_items
        ],
    )


public_invoice_router = Router(path="", route_handlers=[get_public_invoice], tags=["public-invoices"])
