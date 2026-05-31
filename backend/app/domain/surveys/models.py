from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.surveys.enums import SurveySource, SurveyState
from app.domain.vessels.models import Vessel
from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.base.search import SearchMixin
from app.platform.embeddings.mixin import EmbeddableMixin
from app.platform.form_dsl.mixin import FormResponseMixin
from app.platform.media.models import Media
from app.platform.sequences.enums import SequenceType
from app.platform.sequences.mixins import SequenceMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class SurveyTemplate(OrgScopedMixin, SearchMixin, EmbeddableMixin, BaseDBModel):
    trgm_columns = ["name"]
    search_label_field = "name"
    search_entity_type = "survey_template"
    search_detail_prefix = "/surveys/templates"
    embedding_columns = ["name"]
    embedding_dim = 1536
    __tablename__ = "survey_templates"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(sa.Text)
    tags: Mapped[list[Any]] = mapped_column(JSONB)
    definition: Mapped[dict[str, Any]] = mapped_column(JSONB)

    def embedding_content(self) -> str:
        section_titles: list[str] = []
        for section in (self.definition or {}).get("sections") or []:
            title = section.get("title") if isinstance(section, dict) else None
            if title:
                section_titles.append(str(title))
        return "\n".join([self.name, *section_titles])


class Survey(
    OrgScopedMixin,
    SearchMixin,
    FormResponseMixin,
    SequenceMixin(sequence_type=SequenceType.survey_identifier, prefix="SUR"),
    StateMachineMixin(state_enum=SurveyState, initial_state=SurveyState.scheduled),
):
    trgm_columns = ["identifier"]
    search_label_field = "identifier"
    search_entity_type = "survey"
    search_detail_prefix = "/surveys"

    def get_search_label(self) -> str:
        return self.identifier or str(self.id)

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
    template_version: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    source: Mapped[SurveySource] = mapped_column(
        TextEnum(SurveySource),
        nullable=False,
        server_default=SurveySource.MANUAL.name,
    )
    source_message_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("email_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_attachment_index: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)

    vessel: Mapped[Vessel] = relationship("Vessel", foreign_keys=[vessel_id], lazy="raise")
    assigned_surveyor: Mapped[Any] = relationship("User", foreign_keys=[assigned_surveyor_id], lazy="raise")
    template: Mapped[SurveyTemplate | None] = relationship("SurveyTemplate", foreign_keys=[template_id], lazy="raise")
    media: Mapped[list[Media]] = relationship(
        "Media",
        secondary="survey_media",
        lazy="noload",
        viewonly=True,
    )
    survey_media: Mapped[list[SurveyMedia]] = relationship(
        "SurveyMedia",
        back_populates="survey",
        lazy="noload",
        cascade="all, delete-orphan",
    )


class SurveyMedia(OrgScopedMixin, BaseDBModel):
    """Association row linking a survey to a media asset.

    The session-level raiseload rule means the `Media` and `Survey`
    relationships here need `lazy="noload"`; callers explicitly
    `joinedload` them in CRUD configs.
    """

    __tablename__ = "survey_media"
    __table_args__ = (sa.UniqueConstraint("survey_id", "media_id"),)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    survey_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True
    )
    media_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True
    )
    node_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("form_nodes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    caption: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0, server_default="0")

    survey: Mapped[Survey] = relationship("Survey", foreign_keys=[survey_id], lazy="noload")
    media: Mapped[Media] = relationship("Media", foreign_keys=[media_id], lazy="noload")
