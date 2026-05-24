from __future__ import annotations

from enum import StrEnum, auto

import msgspec
from litestar.exceptions import NotFoundException, ValidationException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.reports.builder import build_report_blocks
from app.domain.reports.models import Report
from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey, SurveyMedia, SurveyTemplate
from app.domain.surveys.schemas import (
    AddFindingData,
    AssignSurveyMediaData,
    AttachSurveyMediaData,
    CreateSurveyData,
    CreateSurveyTemplateData,
    SetSurveyMediaCaptionData,
    UpdateSurveyData,
    UpdateSurveyTemplateData,
)
from app.domain.surveys.state_machine import survey_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.form_dsl.actions import invalidate_owner, next_sort_order
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.materialize import materialize_form_response
from app.platform.form_dsl.models import FormNode
from app.platform.sequences.service import assign_identifier_if_missing

# ── Survey actions ─────────────────────────────────────────────────────────────


class SurveyActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    START_DRAFT = auto()
    DELIVER = auto()
    CANCEL = auto()


survey_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_ACTIONS,
    default_invalidation="/surveys",
    model_type=Survey,
)


@survey_actions
class CreateSurvey(BaseTopLevelAction[CreateSurveyData]):
    action_key = SurveyActionKey.CREATE
    label = "Create Survey"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "vessel_id": {"model": "Vessel", "create_action": "vessel_actions__create"},
        "assigned_surveyor_id": {"model": "User", "create_action": None},
        "template_id": {"model": "SurveyTemplate", "create_action": "survey_template_actions__create"},
    }

    @classmethod
    async def execute(
        cls, data: CreateSurveyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        survey = Survey(
            organization_id=deps.user.organization_id,
            vessel_id=data.vessel_id,
            assigned_surveyor_id=data.assigned_surveyor_id,
            template_id=data.template_id,
        )
        transaction.add(survey)
        await transaction.flush()

        if data.template_id is not None:
            template = await transaction.get(SurveyTemplate, data.template_id)
            if template is None:
                raise NotFoundException("Template not found")
            survey.template_version = await materialize_form_response(
                transaction, survey, owner_type=Survey.__tablename__, definition=template.definition
            )

        return ActionExecutionResponse(message="Survey created", created_id=survey.id)


@survey_actions
class UpdateSurvey(BaseObjectAction[Survey, UpdateSurveyData]):
    action_key = SurveyActionKey.UPDATE
    label = "Edit Survey"
    icon = ActionIcon.EDIT
    priority = 20
    form_entity_fields = {
        "assigned_surveyor_id": {"model": "User", "create_action": None},
        "template_id": {"model": "SurveyTemplate", "create_action": "survey_template_actions__create"},
    }

    @classmethod
    async def execute(
        cls, obj: Survey, data: UpdateSurveyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.assigned_surveyor_id = data.assigned_surveyor_id
        obj.template_id = data.template_id
        return ActionExecutionResponse(message="Survey updated")


@survey_actions
class DeleteSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.DELETE
    label = "Delete Survey"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this survey?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return obj.state in {SurveyState.scheduled, SurveyState.cancelled}

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Survey deleted")


@survey_actions
class StartDraft(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.START_DRAFT
    label = "Start Draft"
    icon = ActionIcon.PLAY
    priority = 30
    target_state = SurveyState.in_draft

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.in_draft, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await assign_identifier_if_missing(transaction, obj)
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.in_draft, actor=deps.user)
        return ActionExecutionResponse(message="Survey moved to draft")


@survey_actions
class DeliverSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.DELIVER
    label = "Deliver Survey"
    icon = ActionIcon.SEND
    priority = 35
    target_state = SurveyState.delivered

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.delivered, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        blocks = await build_report_blocks(transaction, obj)
        report = Report(
            organization_id=deps.user.organization_id,
            survey_id=obj.id,
            title=None,
            blocks=blocks,
        )
        transaction.add(report)
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.delivered, actor=deps.user)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Survey delivered",
            invalidate_queries=["/surveys", "/reports", f"/surveys/{obj.id}"],
        )


@survey_actions
class CancelSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.CANCEL
    label = "Cancel Survey"
    icon = ActionIcon.X
    priority = 85
    confirmation_message = "Are you sure you want to cancel this survey?"
    target_state = SurveyState.cancelled

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.cancelled, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.cancelled, actor=deps.user)
        return ActionExecutionResponse(message="Survey cancelled")


# ── Survey template actions ────────────────────────────────────────────────────


class SurveyTemplateActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()


survey_template_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_TEMPLATE_ACTIONS,
    default_invalidation="/survey-templates",
    model_type=SurveyTemplate,
)


@survey_template_actions
class CreateSurveyTemplate(BaseTopLevelAction[CreateSurveyTemplateData]):
    action_key = SurveyTemplateActionKey.CREATE
    label = "Create Template"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: CreateSurveyTemplateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        template = SurveyTemplate(
            organization_id=deps.user.organization_id,
            name=data.name,
            tags=data.tags,
            definition=msgspec.to_builtins(data.definition),
        )
        transaction.add(template)
        await transaction.flush()
        return ActionExecutionResponse(message="Template created", created_id=template.id)


@survey_template_actions
class UpdateSurveyTemplate(BaseObjectAction[SurveyTemplate, UpdateSurveyTemplateData]):
    action_key = SurveyTemplateActionKey.UPDATE
    label = "Edit Template"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    def is_available(cls, obj: SurveyTemplate, deps: ActionDeps) -> bool:
        return True

    @classmethod
    async def execute(
        cls, obj: SurveyTemplate, data: UpdateSurveyTemplateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.tags = data.tags
        obj.definition = msgspec.to_builtins(data.definition)
        return ActionExecutionResponse(message="Template updated")


@survey_template_actions
class DeleteSurveyTemplate(BaseObjectAction[SurveyTemplate, EmptyActionData]):
    action_key = SurveyTemplateActionKey.DELETE
    label = "Delete Template"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Delete this survey template?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: SurveyTemplate, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Template deleted")


# ── SurveyMedia actions ────────────────────────────────────────────────────────


class SurveyMediaActionKey(StrEnum):
    ATTACH = auto()
    DETACH = auto()
    SET_CAPTION = auto()
    ASSIGN = auto()


survey_media_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_MEDIA_ACTIONS,
    default_invalidation="/survey-media",
    model_type=SurveyMedia,
)


@survey_media_actions
class AttachSurveyMedia(BaseTopLevelAction[AttachSurveyMediaData]):
    action_key = SurveyMediaActionKey.ATTACH
    label = "Attach Media"
    icon = ActionIcon.ADD
    priority = 10
    is_hidden = True

    @classmethod
    async def execute(
        cls, data: AttachSurveyMediaData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        survey = await transaction.get(Survey, data.survey_id)
        if survey is None:
            raise NotFoundException("Survey not found")
        caption = data.caption
        if caption is None and data.node_id is not None:
            node = await transaction.get(FormNode, data.node_id)
            if node is not None:
                caption = node.label
        sm = SurveyMedia(
            organization_id=deps.user.organization_id,
            survey_id=data.survey_id,
            media_id=data.media_id,
            node_id=data.node_id,
            caption=caption,
            sort_order=data.sort_order,
        )
        transaction.add(sm)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Media attached",
            created_id=sm.id,
            invalidate_queries=["/survey-media", f"/surveys/{data.survey_id}"],
        )


@survey_media_actions
class DetachSurveyMedia(BaseObjectAction[SurveyMedia, EmptyActionData]):
    action_key = SurveyMediaActionKey.DETACH
    label = "Remove"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Remove this photo from the survey?"

    @classmethod
    async def execute(
        cls, obj: SurveyMedia, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await transaction.delete(obj)
        return ActionExecutionResponse(message="Media removed")


@survey_media_actions
class SetSurveyMediaCaption(BaseObjectAction[SurveyMedia, SetSurveyMediaCaptionData]):
    action_key = SurveyMediaActionKey.SET_CAPTION
    label = "Edit Caption"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: SurveyMedia, data: SetSurveyMediaCaptionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.caption = data.caption
        return ActionExecutionResponse(message="Caption updated")


@survey_media_actions
class AssignSurveyMedia(BaseObjectAction[SurveyMedia, AssignSurveyMediaData]):
    action_key = SurveyMediaActionKey.ASSIGN
    label = "Assign to node"
    icon = ActionIcon.EDIT
    priority = 15
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: SurveyMedia, data: AssignSurveyMediaData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.node_id = data.node_id
        if data.node_id is not None and not obj.caption:
            node = await transaction.get(FormNode, data.node_id)
            if node is not None:
                obj.caption = node.label
        return ActionExecutionResponse(
            message="Media assigned",
            invalidate_queries=["/survey-media", f"/surveys/{obj.survey_id}"],
        )


# ── Findings ───────────────────────────────────────────────────────────────────


_VALID_FINDING_SEVERITIES = {"info", "advisory", "critical"}


class SurveyFindingActionKey(StrEnum):
    ADD = auto()


survey_finding_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_FINDING_ACTIONS,
    model_type=FormNode,
)


@survey_finding_actions
class AddFinding(BaseTopLevelAction[AddFindingData]):
    action_key = SurveyFindingActionKey.ADD
    label = "Add finding"
    icon = ActionIcon.ADD
    is_hidden = True

    @classmethod
    async def execute(
        cls, data: AddFindingData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if data.severity not in _VALID_FINDING_SEVERITIES:
            raise ValidationException(f"Invalid severity '{data.severity}'")

        parent = await transaction.get(FormNode, data.parent_id)
        if parent is None:
            raise NotFoundException("Parent node not found")

        originating_snapshot: str | None = None
        if parent.kind == FormNodeKind.field and parent.value is not None:
            originating_snapshot = str(parent.value)

        sort_order = await next_sort_order(transaction, parent.id, parent.owner_type, parent.owner_id)
        node = FormNode(
            organization_id=parent.organization_id,
            owner_type=parent.owner_type,
            owner_id=parent.owner_id,
            parent_id=parent.id,
            kind=FormNodeKind.annotation,
            schema_ref=None,
            label=data.summary,
            value={
                "type": "finding",
                "severity": data.severity,
                "summary": data.summary,
                "detail": data.detail,
                "recommended_action": data.recommended_action,
                "originating_value_snapshot": originating_snapshot,
            },
            sort_order=sort_order,
        )
        transaction.add(node)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Finding added", created_id=node.id, invalidate_queries=invalidate_owner(parent)
        )
