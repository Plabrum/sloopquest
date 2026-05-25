from __future__ import annotations

import msgspec
import sqlalchemy as sa
from litestar import Router, get
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import config
from app.domain.surveys.models import Survey, SurveyMedia, SurveyTemplate
from app.domain.surveys.schemas import (
    SurveyDetail,
    SurveyFormNodeRef,
    SurveyListItem,
    SurveyMediaDetail,
    SurveyMediaListItem,
    SurveyTemplateDetail,
    SurveyTemplateListItem,
)
from app.domain.users.models import User
from app.platform.actions.deps import ActionDeps
from app.platform.actions.registry import ActionRegistry
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import EntityRef
from app.platform.clients.s3 import BaseS3Client, LocalS3Client, S3Client
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig
from app.platform.form_dsl.conditions import resolve_visibility, section_completion
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.form_dsl.schema import TemplateDefinition
from app.platform.form_dsl.schemas import SectionCompletion
from app.utils.sqids import Sqid


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


def _to_form_node_ref(
    node: FormNode,
    visibility: dict[int, bool],
    media_by_node: dict[int, list[SurveyMediaListItem]],
    findings_by_parent: dict[int, list[SurveyFormNodeRef]],
    action_deps: ActionDeps | None,
) -> SurveyFormNodeRef:
    actions: list = []
    if action_deps is not None:
        group = ActionRegistry().find_by_model(FormNode)
        if group is not None:
            actions = group.get_available_actions(action_deps, node)
    return SurveyFormNodeRef(
        id=node.id,
        parent_id=node.parent_id,
        kind=node.kind,
        schema_ref=node.schema_ref,
        label=node.label,
        value=node.value,
        config=node.config,
        sort_order=node.sort_order,
        condition_visible=visibility.get(node.id),
        attached_media=media_by_node.get(node.id, []),
        findings=findings_by_parent.get(node.id, []),
        actions=actions,
    )


def _to_survey_detail(survey: Survey, user: User, action_deps: ActionDeps | None = None) -> SurveyDetail:
    template_ref = (
        EntityRef(
            id=survey.template.id,
            label=survey.template.name,
            href=f"/survey-templates/{survey.template.id}",
        )
        if survey.template is not None
        else None
    )
    visibility = resolve_visibility(survey.form_nodes)

    media_by_node: dict[int, list[SurveyMediaListItem]] = {}
    unassigned_media: list[SurveyMediaListItem] = []
    for sm in survey.survey_media:
        item = _survey_media_to_item(sm, user)
        if sm.node_id is None:
            unassigned_media.append(item)
        else:
            media_by_node.setdefault(sm.node_id, []).append(item)

    # First pass: build refs for annotation (finding) nodes so structural nodes
    # can embed them in a second pass.
    annotations = [n for n in survey.form_nodes if n.kind == FormNodeKind.annotation]
    structural = [n for n in survey.form_nodes if n.kind != FormNodeKind.annotation]
    findings_by_parent: dict[int, list[SurveyFormNodeRef]] = {}
    for n in sorted(annotations, key=lambda n: n.sort_order):
        if n.parent_id is None:
            continue
        ref = _to_form_node_ref(n, visibility, media_by_node, {}, action_deps)
        findings_by_parent.setdefault(n.parent_id, []).append(ref)

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
        template_version=survey.template_version,
        form_nodes=[
            _to_form_node_ref(n, visibility, media_by_node, findings_by_parent, action_deps)
            for n in sorted(structural, key=lambda n: (n.parent_id or 0, n.sort_order))
        ],
        unassigned_media=unassigned_media,
        section_completion=[
            SectionCompletion(section_id=Sqid(sid), filled=v["filled"], total=v["total"])
            for sid, v in section_completion(survey.form_nodes).items()
        ],
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
        joinedload(Survey.form_nodes),
        joinedload(Survey.survey_media).joinedload(SurveyMedia.media),
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


class AdHocSuggestion(msgspec.Struct):
    label: str
    type: str
    count: int


class AdHocSuggestionsResponse(msgspec.Struct):
    threshold: int
    suggestions: list[AdHocSuggestion]


_AD_HOC_PROMOTE_THRESHOLD = 3


@get("/ad-hoc-suggestions")
async def list_ad_hoc_suggestions(
    transaction: AsyncSession,
    user: User,
) -> AdHocSuggestionsResponse:
    label_expr = FormNode.label
    type_expr = sa.text("config->>'type'")
    stmt = (
        sa.select(label_expr, type_expr, sa.func.count(sa.distinct(FormNode.owner_id)))
        .where(
            FormNode.owner_type == Survey.__tablename__,
            FormNode.schema_ref.is_(None),
            FormNode.kind == "field",
            FormNode.deleted_at.is_(None),
        )
        .group_by(label_expr, type_expr)
        .having(sa.func.count(sa.distinct(FormNode.owner_id)) >= _AD_HOC_PROMOTE_THRESHOLD)
        .order_by(sa.func.count(sa.distinct(FormNode.owner_id)).desc(), label_expr)
    )
    rows = (await transaction.execute(stmt)).all()
    suggestions = [AdHocSuggestion(label=row[0], type=row[1] or "text", count=int(row[2])) for row in rows]
    return AdHocSuggestionsResponse(threshold=_AD_HOC_PROMOTE_THRESHOLD, suggestions=suggestions)


survey_router = Router(
    path="/surveys",
    route_handlers=[_survey_controller, list_ad_hoc_suggestions],
    tags=["surveys"],
)


def _to_template_list_item(template: SurveyTemplate, user: User) -> SurveyTemplateListItem:
    return SurveyTemplateListItem(id=template.id, name=template.name, tags=template.tags)


def _to_template_detail(template: SurveyTemplate, user: User) -> SurveyTemplateDetail:
    return SurveyTemplateDetail(
        id=template.id,
        name=template.name,
        tags=template.tags,
        definition=msgspec.convert(template.definition, TemplateDefinition),
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
        node_id=sm.node_id,
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
    filterable_columns={"survey_id", "node_id"},
    sortable_columns={"sort_order", "created_at"},
    default_sort="sort_order",
)

_survey_media_controller = make_crud_controller("", _survey_media_config)

survey_media_router = Router(path="/survey-media", route_handlers=[_survey_media_controller], tags=["survey-media"])
