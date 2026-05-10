from __future__ import annotations

from enum import StrEnum, auto

import msgspec
from litestar.exceptions import NotFoundException, ValidationException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import Survey, SurveyTemplate
from app.domain.surveys.schemas import (
    CreateSurveyData,
    CreateSurveyTemplateData,
    SaveSurveyResponseData,
    UpdateSurveyData,
    UpdateSurveyTemplateData,
)
from app.domain.surveys.state_machine import survey_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.form_dsl.interpreter import build_response_struct
from app.platform.form_dsl.schema import FormDefinition

# ── Survey actions ─────────────────────────────────────────────────────────────


class SurveyActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SCHEDULE = auto()
    START_INSPECTION = auto()
    COMPLETE_INSPECTION = auto()
    MOVE_TO_DRAFT = auto()
    SUBMIT_FOR_REVIEW = auto()
    DELIVER = auto()
    MARK_PAID = auto()
    CANCEL = auto()
    SAVE_RESPONSE = auto()


survey_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_ACTIONS,
    default_invalidation="list_Survey",
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
        return obj.state in {SurveyState.inquiry, SurveyState.cancelled}

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Survey deleted")


@survey_actions
class ScheduleSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.SCHEDULE
    label = "Schedule"
    icon = ActionIcon.CHECK
    priority = 30

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.scheduled, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.scheduled, actor=deps.user)
        return ActionExecutionResponse(message="Survey scheduled")


@survey_actions
class StartInspection(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.START_INSPECTION
    label = "Start Inspection"
    icon = ActionIcon.CHECK
    priority = 31

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.in_field, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.in_field, actor=deps.user)
        return ActionExecutionResponse(message="Inspection started")


@survey_actions
class CompleteInspection(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.COMPLETE_INSPECTION
    label = "Complete Inspection"
    icon = ActionIcon.CHECK
    priority = 32

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return obj.state == SurveyState.in_field and survey_state_machine.can_transition(
            obj, SurveyState.in_draft, deps.user.role
        )

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.in_draft, actor=deps.user)
        return ActionExecutionResponse(message="Inspection complete, survey in draft")


@survey_actions
class SubmitForReview(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.SUBMIT_FOR_REVIEW
    label = "Submit for Review"
    icon = ActionIcon.SEND
    priority = 33

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.in_review, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.in_review, actor=deps.user)
        return ActionExecutionResponse(message="Survey submitted for review")


@survey_actions
class MoveToDraft(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.MOVE_TO_DRAFT
    label = "Back to Draft"
    icon = ActionIcon.EDIT
    priority = 34

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return obj.state == SurveyState.in_review and survey_state_machine.can_transition(
            obj, SurveyState.in_draft, deps.user.role
        )

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.in_draft, actor=deps.user)
        return ActionExecutionResponse(message="Survey moved back to draft")


@survey_actions
class DeliverSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.DELIVER
    label = "Deliver Survey"
    icon = ActionIcon.SEND
    priority = 35

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.delivered, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.delivered, actor=deps.user)
        return ActionExecutionResponse(message="Survey delivered")


@survey_actions
class MarkPaid(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.MARK_PAID
    label = "Mark as Paid"
    icon = ActionIcon.CHECK
    priority = 36

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.paid, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.paid, actor=deps.user)
        return ActionExecutionResponse(message="Survey marked as paid")


@survey_actions
class CancelSurvey(BaseObjectAction[Survey, EmptyActionData]):
    action_key = SurveyActionKey.CANCEL
    label = "Cancel Survey"
    icon = ActionIcon.X
    priority = 85
    confirmation_message = "Are you sure you want to cancel this survey?"

    @classmethod
    def is_available(cls, obj: Survey, deps: ActionDeps) -> bool:
        return survey_state_machine.can_transition(obj, SurveyState.cancelled, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Survey, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(survey_state_machine, obj, SurveyState.cancelled, actor=deps.user)
        return ActionExecutionResponse(message="Survey cancelled")


@survey_actions
class SaveSurveyResponse(BaseObjectAction[Survey, SaveSurveyResponseData]):
    action_key = SurveyActionKey.SAVE_RESPONSE
    label = "Save Inspection Data"
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: Survey, data: SaveSurveyResponseData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if obj.template_id is None:
            raise ValidationException("Survey has no template")
        template = await transaction.get(SurveyTemplate, obj.template_id)
        if template is None:
            raise NotFoundException("Template not found")
        definition = msgspec.convert(template.definition, FormDefinition)
        struct_cls = build_response_struct(definition)
        validated = msgspec.convert(data.response, struct_cls)
        obj.form_response = msgspec.to_builtins(validated)
        return ActionExecutionResponse(message="Inspection data saved")


# ── Survey template actions ────────────────────────────────────────────────────


class SurveyTemplateActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()


survey_template_actions = action_group_factory(
    group_type=ActionGroupType.SURVEY_TEMPLATE_ACTIONS,
    default_invalidation="list_SurveyTemplate",
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
