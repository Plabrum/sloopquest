"""Factories for Invoice and InvoiceLineItem."""

from decimal import Decimal

from faker import Faker
from polyfactory import Use

from app.domain.invoices.models import Invoice, InvoiceLineItem

from .base import BaseFactory

fake = Faker()


class InvoiceFactory(BaseFactory):
    __model__ = Invoice

    identifier = None
    issued_at = None
    due_at = None
    currency = "USD"
    subtotal_cents = 0
    tax_cents = 0
    total_cents = 0
    notes = None

    line_items = []


class InvoiceLineItemFactory(BaseFactory):
    __model__ = InvoiceLineItem

    description = Use(fake.sentence)
    quantity = Decimal("1.00")
    unit_price_cents = 10000
    sort_order = 0

    invoice = None
