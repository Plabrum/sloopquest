from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum

if TYPE_CHECKING:
    from app.domain.users.models import Organization, User


class PricingGuide(OrgScopedMixin, BaseDBModel):
    __tablename__ = "pricing_guides"
    __table_args__ = (
        sa.Index(
            "uq_pricing_guides_active_per_user_service",
            "user_id",
            "service_type",
            unique=True,
            postgresql_where=sa.text("is_active AND deleted_at IS NULL"),
        ),
    )

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.Text)
    service_type: Mapped[ServiceType] = mapped_column(TextEnum(ServiceType), nullable=False)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, server_default="true")

    tiers: Mapped[list[PricingTier]] = relationship(
        "PricingTier",
        back_populates="guide",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="PricingTier.length_until_ft.asc().nulls_last()",
    )
    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="raise")
    organization: Mapped[Organization] = relationship("Organization", foreign_keys=[organization_id], lazy="raise")


class PricingTier(OrgScopedMixin, BaseDBModel):
    __tablename__ = "pricing_tiers"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    guide_id: Mapped[Sqid] = mapped_column(
        SqidType,
        sa.ForeignKey("pricing_guides.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    length_until_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    pricing_type: Mapped[PricingType] = mapped_column(TextEnum(PricingType), nullable=False)
    amount_cents: Mapped[int | None] = mapped_column(sa.Integer)

    guide: Mapped[PricingGuide] = relationship("PricingGuide", back_populates="tiers", lazy="raise")
