from datetime import datetime
from typing import Any

from app.domain.surveys.enums import SurveyState
from app.platform.base.schemas import BaseSchema, EntityRef
from app.platform.form_dsl.schema import FormDefinition
from app.utils.sqids import Sqid


class SurveyListItem(BaseSchema):
    id: Sqid
    state: SurveyState
    vessel: EntityRef
    surveyor: EntityRef
    created_at: datetime


class SurveyDetail(BaseSchema):
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


class SurveyTemplateListItem(BaseSchema):
    id: Sqid
    name: str
    tags: list[str]


class SurveyTemplateDetail(BaseSchema):
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
