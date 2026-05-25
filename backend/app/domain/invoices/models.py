from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.invoices.enums import InvoiceState
from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.base.search import SearchMixin
from app.platform.sequences.enums import SequenceType
from app.platform.sequences.mixins import SequenceMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class Invoice(
    OrgScopedMixin,
    SearchMixin,
    SequenceMixin(
        sequence_type=SequenceType.invoice_identifier,
        prefix="INV",
        padding=6,
        start_value=100_000,
    ),
    StateMachineMixin(state_enum=InvoiceState, initial_state=InvoiceState.draft),
    BaseDBModel,
):
    trgm_columns = ["identifier"]
    fts_columns = ["notes"]
    search_label_field = "identifier"
    search_entity_type = "invoice"
    search_detail_prefix = "/invoices"

    def get_search_label(self) -> str:
        return self.identifier or str(self.id)

    __tablename__ = "invoices"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    survey_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("surveys.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    client_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    issued_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    due_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    currency: Mapped[str] = mapped_column(sa.Text, server_default="USD")
    subtotal_cents: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")
    tax_cents: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")
    total_cents: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")
    notes: Mapped[str | None] = mapped_column(sa.Text)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(sa.Text)
    stripe_client_secret: Mapped[str | None] = mapped_column(sa.Text)
    access_token: Mapped[str | None] = mapped_column(sa.Text, unique=True, index=True)

    line_items: Mapped[list[InvoiceLineItem]] = relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="noload",
    )


class InvoiceLineItem(OrgScopedMixin, BaseDBModel):
    __tablename__ = "invoice_line_items"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[Sqid] = mapped_column(
        SqidType,
        sa.ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(sa.Text)
    quantity: Mapped[Decimal] = mapped_column(sa.Numeric(8, 2), nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="line_items", lazy="raise")
