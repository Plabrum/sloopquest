from __future__ import annotations

import msgspec
from litestar import Router

from app.domain.surveys.models import Survey, SurveyTemplate
from app.domain.surveys.schemas import (
    SurveyDetail,
    SurveyListItem,
    SurveyTemplateDetail,
    SurveyTemplateListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig
from app.platform.form_dsl.schema import FormDefinition


def _to_survey_list_item(survey: Survey, user: User) -> SurveyListItem:
    return SurveyListItem(
        id=survey.id,
        state=survey.state,
        vessel_id=survey.vessel_id,
        assigned_surveyor_id=survey.assigned_surveyor_id,
    )


def _to_survey_detail(survey: Survey, user: User) -> SurveyDetail:
    return SurveyDetail(
        id=survey.id,
        state=survey.state,
        vessel_id=survey.vessel_id,
        assigned_surveyor_id=survey.assigned_surveyor_id,
        template_id=survey.template_id,
        form_response=survey.form_response,
    )


_survey_config = CRUDConfig(
    model=Survey,
    to_list_item=_to_survey_list_item,
    to_detail=_to_survey_detail,
    filterable_columns={"state", "vessel_id", "assigned_surveyor_id", "created_at"},
    sortable_columns={"created_at"},
    label_field="state",
    data_fields=[
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_survey_controller = make_crud_controller("/surveys", _survey_config)

survey_router = Router(path="/surveys", route_handlers=[_survey_controller], tags=["surveys"])


def _to_template_list_item(template: SurveyTemplate, user: User) -> SurveyTemplateListItem:
    return SurveyTemplateListItem(
        id=template.id,
        name=template.name,
        tags=template.tags,
    )


def _to_template_detail(template: SurveyTemplate, user: User) -> SurveyTemplateDetail:
    return SurveyTemplateDetail(
        id=template.id,
        name=template.name,
        tags=template.tags,
        definition=msgspec.convert(template.definition, FormDefinition),
    )


_template_config = CRUDConfig(
    model=SurveyTemplate,
    to_list_item=_to_template_list_item,
    to_detail=_to_template_detail,
    filterable_columns={"name", "created_at"},
    sortable_columns={"name", "created_at"},
    label_field="name",
)

_template_controller = make_crud_controller("/survey-templates", _template_config)

survey_template_router = Router(
    path="/survey-templates", route_handlers=[_template_controller], tags=["survey-templates"]
)
