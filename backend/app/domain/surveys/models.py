from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.addresses.models import Address
from app.domain.surveys.enums import (
    AppraisalPurpose,
    FindingSeverity,
    LossType,
    RecommendationTimeframe,
    ResponseItemStatus,
    SurveyPartyRole,
    SurveyState,
    SurveyType,
    SystemArea,
    VesselStateAtInspection,
)
from app.domain.vessels.models import Vessel
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class SurveyTemplate(TimestampMixin, BaseDBModel):
    __tablename__ = "survey_templates"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(sa.Text)
    applies_to_survey_types: Mapped[list[Any]] = mapped_column(JSONB)
    definition_json: Mapped[dict[str, Any]] = mapped_column(JSONB)


class Survey(
    TimestampMixin,
    StateMachineMixin(state_enum=SurveyState, initial_state=SurveyState.inquiry),
):
    __tablename__ = "surveys"

    survey_type: Mapped[SurveyType] = mapped_column(TextEnum(SurveyType), nullable=False, index=True)

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
    inspection_location_address_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("addresses.id", ondelete="SET NULL"),
        index=True,
    )

    vessel_state_at_inspection: Mapped[VesselStateAtInspection | None] = mapped_column(
        TextEnum(VesselStateAtInspection)
    )
    weather_conditions: Mapped[str | None] = mapped_column(sa.Text)
    purpose_statement: Mapped[str | None] = mapped_column(sa.Text)
    scope_statement: Mapped[str | None] = mapped_column(sa.Text)
    exclusions: Mapped[str | None] = mapped_column(sa.Text)
    limitations: Mapped[str | None] = mapped_column(sa.Text)
    quoted_fee_cents: Mapped[int | None] = mapped_column(sa.Integer)
    included_sea_trial: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false")
    included_haul_out: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false")
    scheduled_for: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    inspection_started_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    inspection_completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    # PrePurchase
    purchase_price_cents: Mapped[int | None] = mapped_column(sa.Integer)
    seller_name: Mapped[str | None] = mapped_column(sa.Text)

    # ConditionAndValuation
    policy_number: Mapped[str | None] = mapped_column(sa.Text)
    renewal_required_by: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    # Damage
    incident_date: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    incident_description: Mapped[str | None] = mapped_column(sa.Text)
    loss_type: Mapped[LossType | None] = mapped_column(TextEnum(LossType))
    claim_number: Mapped[str | None] = mapped_column(sa.Text)
    pending_insurer_approval: Mapped[bool | None] = mapped_column(sa.Boolean)

    # Appraisal
    appraisal_purpose: Mapped[AppraisalPurpose | None] = mapped_column(TextEnum(AppraisalPurpose))
    effective_date: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    vessel: Mapped[Vessel] = relationship(
        "Vessel",
        foreign_keys=[vessel_id],
        lazy="raise",
    )
    assigned_surveyor: Mapped[Any] = relationship(
        "User",
        foreign_keys=[assigned_surveyor_id],
        lazy="raise",
    )
    template: Mapped[SurveyTemplate | None] = relationship(
        "SurveyTemplate",
        foreign_keys=[template_id],
        lazy="raise",
    )
    inspection_location_address: Mapped[Address | None] = relationship(
        "Address",
        foreign_keys=[inspection_location_address_id],
        lazy="raise",
    )
    parties: Mapped[list[SurveyParty]] = relationship(
        "SurveyParty",
        back_populates="survey",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    response_items: Mapped[list[SurveyResponseItem]] = relationship(
        "SurveyResponseItem",
        back_populates="survey",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    findings: Mapped[list[Finding]] = relationship(
        "Finding",
        back_populates="survey",
        cascade="all, delete-orphan",
        lazy="noload",
    )


class SurveyParty(BaseDBModel):
    __tablename__ = "survey_parties"
    __table_args__ = (sa.UniqueConstraint("survey_id", "client_id", "role", name="uq_survey_party"),)

    survey_id: Mapped[int] = mapped_column(
        sa.ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id: Mapped[Sqid] = mapped_column(
        SqidType, sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    role: Mapped[SurveyPartyRole] = mapped_column(TextEnum(SurveyPartyRole), nullable=False)

    survey: Mapped[Survey] = relationship("Survey", back_populates="parties", lazy="raise")
    client: Mapped[Any] = relationship("Client", foreign_keys=[client_id], lazy="raise")


class SurveyResponseItem(BaseDBModel):
    __tablename__ = "survey_response_items"

    survey_id: Mapped[int] = mapped_column(
        sa.ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_node_ref: Mapped[str | None] = mapped_column(sa.Text)
    heading_label: Mapped[str] = mapped_column(sa.Text)
    category_path: Mapped[list[Any]] = mapped_column(JSONB)
    body_text: Mapped[str | None] = mapped_column(sa.Text)
    status: Mapped[ResponseItemStatus] = mapped_column(
        TextEnum(ResponseItemStatus),
        nullable=False,
        default=ResponseItemStatus.not_started,
        server_default=ResponseItemStatus.not_started.name,
    )
    is_finding: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, server_default="0")

    survey: Mapped[Survey] = relationship("Survey", back_populates="response_items", lazy="raise")
    findings: Mapped[list[Finding]] = relationship(
        "Finding",
        back_populates="response_item",
        lazy="noload",
    )


class Finding(BaseDBModel):
    __tablename__ = "findings"

    survey_id: Mapped[int] = mapped_column(
        sa.ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    response_item_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("survey_response_items.id", ondelete="SET NULL"),
        index=True,
    )
    title: Mapped[str] = mapped_column(sa.Text)
    description: Mapped[str | None] = mapped_column(sa.Text)
    system_area: Mapped[SystemArea | None] = mapped_column(TextEnum(SystemArea))
    severity: Mapped[FindingSeverity | None] = mapped_column(TextEnum(FindingSeverity))
    location_on_vessel: Mapped[str | None] = mapped_column(sa.Text)
    is_pre_existing: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false")

    survey: Mapped[Survey] = relationship("Survey", back_populates="findings", lazy="raise")
    response_item: Mapped[SurveyResponseItem | None] = relationship(
        "SurveyResponseItem",
        back_populates="findings",
        lazy="raise",
    )
    recommendations: Mapped[list[Recommendation]] = relationship(
        "Recommendation",
        back_populates="finding",
        cascade="all, delete-orphan",
        lazy="noload",
    )


class Recommendation(BaseDBModel):
    __tablename__ = "recommendations"

    finding_id: Mapped[int] = mapped_column(
        sa.ForeignKey("findings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(sa.Text)
    timeframe: Mapped[RecommendationTimeframe] = mapped_column(TextEnum(RecommendationTimeframe), nullable=False)
    is_completed: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false")

    finding: Mapped[Finding] = relationship("Finding", back_populates="recommendations", lazy="raise")
