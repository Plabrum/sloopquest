from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.surveys.enums import SurveyType
from app.domain.surveys.models import Survey, SurveyTemplate
from app.domain.surveys.schemas import (
    FindingSchema,
    SurveyDetail,
    SurveyListItem,
    SurveyPartySchema,
    SurveyTemplateDetail,
    SurveyTemplateListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_survey_list_item(survey: Survey, user: User) -> SurveyListItem:
    return SurveyListItem(
        id=survey.id,
        survey_type=SurveyType(survey.survey_type),
        state=survey.state,
        vessel_id=survey.vessel_id,
        assigned_surveyor_id=survey.assigned_surveyor_id,
        scheduled_for=survey.scheduled_for,
        created_at=survey.created_at,
    )


def _to_survey_detail(survey: Survey, user: User) -> SurveyDetail:
    return SurveyDetail(
        id=survey.id,
        survey_type=SurveyType(survey.survey_type),
        state=survey.state,
        vessel_id=survey.vessel_id,
        assigned_surveyor_id=survey.assigned_surveyor_id,
        template_id=survey.template_id,
        vessel_state_at_inspection=survey.vessel_state_at_inspection,
        weather_conditions=survey.weather_conditions,
        purpose_statement=survey.purpose_statement,
        scope_statement=survey.scope_statement,
        exclusions=survey.exclusions,
        limitations=survey.limitations,
        quoted_fee_cents=survey.quoted_fee_cents,
        included_sea_trial=survey.included_sea_trial,
        included_haul_out=survey.included_haul_out,
        scheduled_for=survey.scheduled_for,
        inspection_started_at=survey.inspection_started_at,
        inspection_completed_at=survey.inspection_completed_at,
        purchase_price_cents=survey.purchase_price_cents,
        seller_name=survey.seller_name,
        policy_number=survey.policy_number,
        renewal_required_by=survey.renewal_required_by,
        incident_date=survey.incident_date,
        incident_description=survey.incident_description,
        loss_type=survey.loss_type,
        claim_number=survey.claim_number,
        pending_insurer_approval=survey.pending_insurer_approval,
        appraisal_purpose=survey.appraisal_purpose,
        effective_date=survey.effective_date,
        parties=[SurveyPartySchema(id=p.id, client_id=p.client_id, role=p.role) for p in survey.parties],
        findings=[
            FindingSchema(
                id=f.id,
                title=f.title,
                description=f.description,
                system_area=f.system_area,
                severity=f.severity,
                location_on_vessel=f.location_on_vessel,
                is_pre_existing=f.is_pre_existing,
                created_at=f.created_at,
            )
            for f in survey.findings
        ],
        created_at=survey.created_at,
        updated_at=survey.updated_at,
    )


_survey_config = CRUDConfig(
    model=Survey,
    to_list_item=_to_survey_list_item,
    to_detail=_to_survey_detail,
    detail_load_options=[
        selectinload(Survey.parties),
        selectinload(Survey.findings),
    ],
    filterable_columns={"survey_type", "state", "vessel_id", "assigned_surveyor_id", "scheduled_for", "created_at"},
    sortable_columns={"scheduled_for", "created_at"},
    label_field="survey_type",
)

_survey_controller = make_crud_controller("/surveys", _survey_config)

survey_router = Router(path="/surveys", route_handlers=[_survey_controller], tags=["surveys"])


def _to_template_list_item(template: SurveyTemplate, user: User) -> SurveyTemplateListItem:
    return SurveyTemplateListItem(
        id=template.id,
        name=template.name,
        applies_to_survey_types=template.applies_to_survey_types,
        created_at=template.created_at,
    )


def _to_template_detail(template: SurveyTemplate, user: User) -> SurveyTemplateDetail:
    return SurveyTemplateDetail(
        id=template.id,
        name=template.name,
        applies_to_survey_types=template.applies_to_survey_types,
        definition_json=template.definition_json,
        created_at=template.created_at,
        updated_at=template.updated_at,
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
