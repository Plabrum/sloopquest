from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.surveys.enums import SurveyState
from app.domain.vessels.models import Vessel
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.base.search import SearchMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class SurveyTemplate(SearchMixin, TimestampMixin, BaseDBModel):
    trgm_columns = ["name"]
    search_label_field = "name"
    search_entity_type = "survey_template"
    search_detail_prefix = "/surveys/templates"
    __tablename__ = "survey_templates"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(sa.Text)
    tags: Mapped[list[Any]] = mapped_column(JSONB)
    definition: Mapped[dict[str, Any]] = mapped_column(JSONB)


class Survey(
    TimestampMixin,
    StateMachineMixin(state_enum=SurveyState, initial_state=SurveyState.inquiry),
):
    __tablename__ = "surveys"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vessel_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("vessels.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_surveyor_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    template_id: Mapped[Sqid | None] = mapped_column(
        SqidType, sa.ForeignKey("survey_templates.id", ondelete="SET NULL"), index=True
    )
    form_response: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    vessel: Mapped[Vessel] = relationship("Vessel", foreign_keys=[vessel_id], lazy="raise")
    assigned_surveyor: Mapped[Any] = relationship("User", foreign_keys=[assigned_surveyor_id], lazy="raise")
    template: Mapped[SurveyTemplate | None] = relationship("SurveyTemplate", foreign_keys=[template_id], lazy="raise")
