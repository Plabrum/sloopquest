from __future__ import annotations

from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.quotes.enums import QuoteState
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class Quote(
    TimestampMixin,
    StateMachineMixin(state_enum=QuoteState, initial_state=QuoteState.draft),
):
    __tablename__ = "quotes"

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
    pricing_guide_id: Mapped[Sqid | None] = mapped_column(
        SqidType, sa.ForeignKey("pricing_guides.id", ondelete="SET NULL"), index=True
    )
    notes: Mapped[str | None] = mapped_column(sa.Text)

    line_items: Mapped[list[QuoteLineItem]] = relationship(
        "QuoteLineItem",
        back_populates="quote",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="QuoteLineItem.sort_order",
    )
    survey: Mapped[Any] = relationship("Survey", foreign_keys=[survey_id], lazy="raise")
    client: Mapped[Any] = relationship("Client", foreign_keys=[client_id], lazy="raise")
    pricing_guide: Mapped[Any] = relationship("PricingGuide", foreign_keys=[pricing_guide_id], lazy="raise")
    organization: Mapped[Any] = relationship("Organization", foreign_keys=[organization_id], lazy="raise")


class QuoteLineItem(BaseDBModel):
    __tablename__ = "quote_line_items"

    quote_id: Mapped[int] = mapped_column(
        sa.ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(sa.Text)
    quantity: Mapped[Decimal] = mapped_column(sa.Numeric(8, 2), nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")

    quote: Mapped[Quote] = relationship("Quote", back_populates="line_items", lazy="raise")
