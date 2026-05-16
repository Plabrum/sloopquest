from datetime import datetime
from typing import Any

from app.domain.surveys.enums import SurveyState
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema, EntityRef
from app.platform.form_dsl.schema import FormDefinition
from app.utils.sqids import Sqid


class SurveyListItem(ActionableList):
    id: Sqid
    state: SurveyState
    vessel: EntityRef
    surveyor: EntityRef
    created_at: datetime


class SurveyDetail(ActionableDetail):
    id: Sqid
    state: SurveyState
    vessel: EntityRef
    surveyor: EntityRef
    template: EntityRef | None
    form_response: dict[str, Any] | None


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
    definition: FormDefinition


class CreateSurveyTemplateData(BaseSchema):
    name: str
    tags: list[str]
    definition: FormDefinition


class UpdateSurveyTemplateData(BaseSchema):
    name: str
    tags: list[str]
    definition: FormDefinition


class SaveSurveyResponseData(BaseSchema):
    response: dict[str, Any]


# ── SurveyMedia ────────────────────────────────────────────────────────────────


class SurveyMediaListItem(ActionableList):
    id: Sqid
    survey_id: Sqid
    media_id: Sqid
    field_id: str | None
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
    field_id: str | None
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
    field_id: str | None = None
    caption: str | None = None
    sort_order: int = 0


class SetSurveyMediaCaptionData(BaseSchema):
    caption: str | None
