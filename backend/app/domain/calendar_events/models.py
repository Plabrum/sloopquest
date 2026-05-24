from __future__ import annotations

from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.domain.addresses.models import Address
from app.domain.calendar_events.enums import CalendarEventState
from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class CalendarEvent(
    OrgScopedMixin,
    StateMachineMixin(state_enum=CalendarEventState, initial_state=CalendarEventState.confirmed),
    BaseDBModel,
):
    __tablename__ = "calendar_events"
    __table_args__ = (
        sa.CheckConstraint(
            '(all_day AND start IS NULL AND "end" IS NULL '
            "AND start_date IS NOT NULL AND end_date IS NOT NULL) "
            'OR (NOT all_day AND start IS NOT NULL AND "end" IS NOT NULL '
            "AND start_date IS NULL AND end_date IS NULL)",
            name="calendar_events_window_xor",
        ),
    )

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Timed events use start/end (timestamptz). All-day events use start_date/end_date
    # (naive `date`, inclusive on both ends). Exactly one pair is set per row, gated
    # by `all_day`.
    start: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), index=True)
    end: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), index=True)
    start_date: Mapped[date | None] = mapped_column(sa.Date, index=True)
    end_date: Mapped[date | None] = mapped_column(sa.Date, index=True)
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

    effective_start = column_property(sa.func.coalesce(start, sa.cast(start_date, sa.DateTime(timezone=True))))
