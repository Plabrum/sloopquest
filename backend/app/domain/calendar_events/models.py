from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.addresses.models import Address
from app.domain.calendar_events.enums import CalendarEventState
from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class CalendarEvent(
    OrgScopedMixin,
    StateMachineMixin(state_enum=CalendarEventState, initial_state=CalendarEventState.tentative),
    BaseDBModel,
):
    __tablename__ = "calendar_events"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, index=True)
    end: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, index=True)
    all_day: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False, server_default=sa.false())
    name: Mapped[str | None] = mapped_column(sa.Text)
    description: Mapped[str | None] = mapped_column(sa.Text)
    attendees: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    survey_id: Mapped[Sqid | None] = mapped_column(
        SqidType, sa.ForeignKey("surveys.id", ondelete="SET NULL"), index=True
    )
    client_id: Mapped[Sqid | None] = mapped_column(
        SqidType, sa.ForeignKey("clients.id", ondelete="SET NULL"), index=True
    )
    address_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("addresses.id", ondelete="SET NULL"),
        index=True,
    )
    address: Mapped[Address | None] = relationship(
        "Address",
        foreign_keys=[address_id],
        lazy="raise",
    )
