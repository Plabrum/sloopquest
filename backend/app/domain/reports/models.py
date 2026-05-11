from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.reports.enums import ReportState
from app.platform.base.models import TimestampMixin
from app.platform.base.search import SearchMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class Report(
    SearchMixin,
    TimestampMixin,
    StateMachineMixin(state_enum=ReportState, initial_state=ReportState.draft),
):
    trgm_columns = ["title"]
    fts_columns = ["summary"]
    search_label_field = "title"
    search_entity_type = "report"
    search_detail_prefix = "/reports"
    __tablename__ = "reports"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    survey_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("surveys.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str | None] = mapped_column(sa.Text)
    summary: Mapped[str | None] = mapped_column(sa.Text)
    market_value_cents: Mapped[int | None] = mapped_column(sa.Integer)
    replacement_value_cents: Mapped[int | None] = mapped_column(sa.Integer)
    watermarked_file_key: Mapped[str | None] = mapped_column(sa.Text)
    released_file_key: Mapped[str | None] = mapped_column(sa.Text)
    released_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    survey: Mapped[Any] = relationship(
        "Survey",
        foreign_keys=[survey_id],
        lazy="raise",
    )
    organization: Mapped[Any] = relationship(
        "Organization",
        foreign_keys=[organization_id],
        lazy="raise",
    )
