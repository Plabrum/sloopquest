from __future__ import annotations

from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.pricing_guides.enums import PricingType
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class PricingGuide(TimestampMixin, BaseDBModel):
    __tablename__ = "pricing_guides"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.Text)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, server_default="true")

    tiers: Mapped[list[PricingTier]] = relationship(
        "PricingTier",
        back_populates="guide",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="PricingTier.sort_order",
    )
    user: Mapped[Any] = relationship("User", foreign_keys=[user_id], lazy="raise")
    organization: Mapped[Any] = relationship("Organization", foreign_keys=[organization_id], lazy="raise")


class PricingTier(BaseDBModel):
    __tablename__ = "pricing_tiers"

    guide_id: Mapped[int] = mapped_column(
        sa.ForeignKey("pricing_guides.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_type: Mapped[str | None] = mapped_column(sa.Text)
    length_min_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    length_max_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    pricing_type: Mapped[PricingType] = mapped_column(TextEnum(PricingType), nullable=False)
    amount_cents: Mapped[int | None] = mapped_column(sa.Integer)
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")

    guide: Mapped[PricingGuide] = relationship("PricingGuide", back_populates="tiers", lazy="raise")
