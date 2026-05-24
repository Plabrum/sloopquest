from __future__ import annotations

from datetime import datetime
from typing import Any

from app.domain.surveys.enums import SurveyState
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema, EntityRef
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.schema import TemplateDefinition
from app.platform.form_dsl.schemas import SectionCompletion
from app.utils.sqids import Sqid


class SurveyListItem(ActionableList):
    id: Sqid
    state: SurveyState
    vessel: EntityRef
    surveyor: EntityRef
    created_at: datetime


# ── SurveyMedia ────────────────────────────────────────────────────────────────


class SurveyMediaListItem(ActionableList):
    id: Sqid
    survey_id: Sqid
    media_id: Sqid
    node_id: Sqid | None
    caption: str | None
    sort_order: int
    file_name: str
    file_type: str
    mime_type: str
    view_url: str
    thumbnail_url: str | None


class SurveyMediaDetail(ActionableDetail):
    id: Sqid
    survey_id: Sqid
    media_id: Sqid
    node_id: Sqid | None
    caption: str | None
    sort_order: int
    file_name: str
    file_type: str
    mime_type: str
    view_url: str
    thumbnail_url: str | None


class AttachSurveyMediaData(BaseSchema):
    survey_id: Sqid
    media_id: Sqid
    node_id: Sqid | None = None
    caption: str | None = None
    sort_order: int = 0


class SetSurveyMediaCaptionData(BaseSchema):
    caption: str | None


class AssignSurveyMediaData(BaseSchema):
    node_id: Sqid | None


# ── Findings ───────────────────────────────────────────────────────────────────


class AddFindingData(BaseSchema):
    parent_id: Sqid
    severity: str  # 'info' | 'advisory' | 'critical'
    summary: str
    detail: str | None = None
    recommended_action: str | None = None


# ── Survey detail ──────────────────────────────────────────────────────────────


class SurveyFormNodeRef(BaseSchema):
    """Survey-flavored node ref: structural fields + attached media + findings."""

    id: Sqid
    parent_id: Sqid | None
    kind: FormNodeKind
    schema_ref: str | None
    label: str
    value: Any | None
    config: dict[str, Any] | None
    sort_order: int
    condition_visible: bool | None = None
    attached_media: list[SurveyMediaListItem] = []
    findings: list[SurveyFormNodeRef] = []


class SurveyDetail(ActionableDetail):
    id: Sqid
    state: SurveyState
    vessel: EntityRef
    surveyor: EntityRef
    template: EntityRef | None
    template_version: int | None
    form_nodes: list[SurveyFormNodeRef]
    unassigned_media: list[SurveyMediaListItem]
    section_completion: list[SectionCompletion]


class CreateSurveyData(BaseSchema):
    vessel_id: Sqid
    assigned_surveyor_id: Sqid
    template_id: Sqid | None = None


class UpdateSurveyData(BaseSchema):
    assigned_surveyor_id: Sqid
    template_id: Sqid | None


class SurveyTemplateListItem(ActionableList):
    id: Sqid
    name: str
    tags: list[str]


class SurveyTemplateDetail(ActionableDetail):
    id: Sqid
    name: str
    tags: list[str]
    definition: TemplateDefinition


class CreateSurveyTemplateData(BaseSchema):
    name: str
    tags: list[str]
    definition: TemplateDefinition


class UpdateSurveyTemplateData(BaseSchema):
    name: str
    tags: list[str]
    definition: TemplateDefinition
