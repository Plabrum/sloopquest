from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.subscriptions.enums import SubscriptionPlan, SubscriptionStatus
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.textenum import TextEnum


class Subscription(
    OrgScopedMixin,
    StateMachineMixin(state_enum=SubscriptionStatus, initial_state=SubscriptionStatus.trialing),
):
    __tablename__ = "subscriptions"
    __table_args__ = (sa.UniqueConstraint("organization_id", name="uq_subscription_per_org"),)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(TextEnum(SubscriptionPlan), nullable=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    current_period_start: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    stripe_subscription_id: Mapped[str | None] = mapped_column(sa.Text)

    organization: Mapped[Any] = relationship(
        "Organization",
        foreign_keys=[organization_id],
        lazy="raise",
    )
