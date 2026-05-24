from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.reports.enums import ReportState
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.base.search import SearchMixin
from app.platform.sequences.enums import SequenceType
from app.platform.sequences.mixins import SequenceMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class Report(
    OrgScopedMixin,
    SearchMixin,
    SequenceMixin(sequence_type=SequenceType.report_identifier, prefix="R"),
    StateMachineMixin(state_enum=ReportState, initial_state=ReportState.draft),
):
    trgm_columns = ["identifier", "title"]
    fts_columns = ["summary"]
    search_label_field = "identifier"
    search_entity_type = "report"
    search_detail_prefix = "/reports"

    def get_search_label(self) -> str:
        return self.identifier or self.title or str(self.id)

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
    blocks: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default="[]", default=list)

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
