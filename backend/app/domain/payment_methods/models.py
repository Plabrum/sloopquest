from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin


class PaymentMethod(OrgScopedMixin, BaseDBModel):
    __tablename__ = "payment_methods"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stripe_payment_method_id: Mapped[str] = mapped_column(sa.Text, unique=True)
    brand: Mapped[str] = mapped_column(sa.Text)
    last4: Mapped[str] = mapped_column(sa.Text)
    exp_month: Mapped[int] = mapped_column(sa.Integer)
    exp_year: Mapped[int] = mapped_column(sa.Integer)
    is_default: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
        server_default=sa.text("false"),
    )
