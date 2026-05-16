from __future__ import annotations

import msgspec
from litestar import Router
from sqlalchemy.orm import joinedload

from app.config import config
from app.domain.surveys.models import Survey, SurveyMedia, SurveyTemplate
from app.domain.surveys.schemas import (
    SurveyDetail,
    SurveyListItem,
    SurveyMediaDetail,
    SurveyMediaListItem,
    SurveyTemplateDetail,
    SurveyTemplateListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import EntityRef
from app.platform.clients.s3 import BaseS3Client, LocalS3Client, S3Client
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig
from app.platform.form_dsl.schema import FormDefinition


def _to_survey_list_item(survey: Survey, user: User) -> SurveyListItem:
    return SurveyListItem(
        id=survey.id,
        state=survey.state,
        vessel=EntityRef(
            id=survey.vessel_id,
            label=survey.vessel.name,
            href=f"/vessels/{survey.vessel_id}",
        ),
        surveyor=EntityRef(
            id=survey.assigned_surveyor_id,
            label=survey.assigned_surveyor.name,
            href=f"/users/{survey.assigned_surveyor_id}",
        ),
        created_at=survey.created_at,
    )


def _to_survey_detail(survey: Survey, user: User) -> SurveyDetail:
    template_ref = (
        EntityRef(
            id=survey.template.id,
            label=survey.template.name,
            href=f"/survey-templates/{survey.template.id}",
        )
        if survey.template is not None
        else None
    )
    return SurveyDetail(
        id=survey.id,
        state=survey.state,
        vessel=EntityRef(
            id=survey.vessel_id,
            label=survey.vessel.name,
            href=f"/vessels/{survey.vessel_id}",
        ),
        surveyor=EntityRef(
            id=survey.assigned_surveyor_id,
            label=survey.assigned_surveyor.name,
            href=f"/users/{survey.assigned_surveyor_id}",
        ),
        template=template_ref,
        form_response=survey.form_response,
    )


_survey_config = CRUDConfig(
    model=Survey,
    to_list_item=_to_survey_list_item,
    to_detail=_to_survey_detail,
    list_load_options=[joinedload(Survey.vessel), joinedload(Survey.assigned_surveyor)],
    detail_load_options=[
        joinedload(Survey.vessel),
        joinedload(Survey.assigned_surveyor),
        joinedload(Survey.template),
    ],
    filterable_columns={"state", "vessel_id", "assigned_surveyor_id", "created_at"},
    sortable_columns={"created_at"},
    label_field="state",
    data_fields=[
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_survey_controller = make_crud_controller("", _survey_config)

survey_router = Router(path="/surveys", route_handlers=[_survey_controller], tags=["surveys"])


def _to_template_list_item(template: SurveyTemplate, user: User) -> SurveyTemplateListItem:
    return SurveyTemplateListItem(id=template.id, name=template.name, tags=template.tags)


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

_template_controller = make_crud_controller("", _template_config)

survey_template_router = Router(
    path="/survey-templates", route_handlers=[_template_controller], tags=["survey-templates"]
)


# ── SurveyMedia ────────────────────────────────────────────────────────────────


def _get_s3() -> BaseS3Client:
    return LocalS3Client() if config.IS_DEV else S3Client(config.AWS_REGION)


def _survey_media_to_item(sm: SurveyMedia, user: User) -> SurveyMediaListItem:
    s3 = _get_s3()
    view_url = s3.generate_presigned_download_url(bucket=config.S3_MEDIA_BUCKET, key=sm.media.file_key, expires_in=3600)
    thumbnail_url = (
        s3.generate_presigned_download_url(bucket=config.S3_MEDIA_BUCKET, key=sm.media.thumbnail_key, expires_in=3600)
        if sm.media.thumbnail_key
        else None
    )
    return SurveyMediaListItem(
        id=sm.id,
        survey_id=sm.survey_id,
        media_id=sm.media_id,
        field_id=sm.field_id,
        caption=sm.caption,
        sort_order=sm.sort_order,
        file_name=sm.media.file_name,
        file_type=sm.media.file_type,
        mime_type=sm.media.mime_type,
        view_url=view_url,
        thumbnail_url=thumbnail_url,
    )


def _survey_media_to_detail(sm: SurveyMedia, user: User) -> SurveyMediaDetail:
    item = _survey_media_to_item(sm, user)
    return SurveyMediaDetail(**{f: getattr(item, f) for f in item.__struct_fields__})


_survey_media_config = CRUDConfig(
    model=SurveyMedia,
    to_list_item=_survey_media_to_item,
    to_detail=_survey_media_to_detail,
    list_load_options=[joinedload(SurveyMedia.media)],
    detail_load_options=[joinedload(SurveyMedia.media)],
    filterable_columns={"survey_id", "field_id"},
    sortable_columns={"sort_order", "created_at"},
    default_sort="sort_order",
)

_survey_media_controller = make_crud_controller("", _survey_media_config)

survey_media_router = Router(path="/survey-media", route_handlers=[_survey_media_controller], tags=["survey-media"])
