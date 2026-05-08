from __future__ import annotations

from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.enums import SurveyState
from app.domain.surveys.models import (
    Finding,
    Recommendation,
    Survey,
    SurveyParty,
    SurveyTemplate,
)
from app.domain.surveys.schemas import (
    AddFindingData,
    AddRecommendationData,
    AddSurveyPartyData,
    CreateSurveyData,
    CreateSurveyTemplateData,
    DeleteFindingData,
    RemoveSurveyPartyData,
    UpdateFindingData,
    UpdateRecommendationData,
    UpdateSurveyData,
    UpdateSurveyTemplateData,
)
from app.domain.surveys.state_machine import survey_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse

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
    ADD_PARTY = auto()
    REMOVE_PARTY = auto()
    ADD_FINDING = auto()
    UPDATE_FINDING = auto()
    DELETE_FINDING = auto()
    ADD_RECOMMENDATION = auto()
    UPDATE_RECOMMENDATION = auto()


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
            survey_type=data.survey_type,
            organization_id=deps.user.organization_id,
            vessel_id=data.vessel_id,
            assigned_surveyor_id=data.assigned_surveyor_id,
            template_id=data.template_id,
            scheduled_for=data.scheduled_for,
            quoted_fee_cents=data.quoted_fee_cents,
            purpose_statement=data.purpose_statement,
            purchase_price_cents=data.purchase_price_cents,
            seller_name=data.seller_name,
            policy_number=data.policy_number,
            incident_description=data.incident_description,
            loss_type=data.loss_type,
            appraisal_purpose=data.appraisal_purpose,
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
        obj.vessel_state_at_inspection = data.vessel_state_at_inspection
        obj.weather_conditions = data.weather_conditions
        obj.purpose_statement = data.purpose_statement
        obj.scope_statement = data.scope_statement
        obj.exclusions = data.exclusions
        obj.limitations = data.limitations
        obj.quoted_fee_cents = data.quoted_fee_cents
        obj.included_sea_trial = data.included_sea_trial
        obj.included_haul_out = data.included_haul_out
        obj.scheduled_for = data.scheduled_for
        obj.purchase_price_cents = data.purchase_price_cents
        obj.seller_name = data.seller_name
        obj.policy_number = data.policy_number
        obj.renewal_required_by = data.renewal_required_by
        obj.incident_date = data.incident_date
        obj.incident_description = data.incident_description
        obj.loss_type = data.loss_type
        obj.claim_number = data.claim_number
        obj.pending_insurer_approval = data.pending_insurer_approval
        obj.appraisal_purpose = data.appraisal_purpose
        obj.effective_date = data.effective_date
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
class AddSurveyParty(BaseObjectAction[Survey, AddSurveyPartyData]):
    action_key = SurveyActionKey.ADD_PARTY
    label = "Add Party"
    icon = ActionIcon.ADD
    priority = 40
    form_entity_fields = {
        "client_id": {"model": "Client", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, obj: Survey, data: AddSurveyPartyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        party = SurveyParty(survey_id=obj.id, client_id=data.client_id, role=data.role)
        transaction.add(party)
        await transaction.flush()
        return ActionExecutionResponse(message="Party added", created_id=party.id)


@survey_actions
class RemoveSurveyParty(BaseObjectAction[Survey, RemoveSurveyPartyData]):
    action_key = SurveyActionKey.REMOVE_PARTY
    label = "Remove Party"
    icon = ActionIcon.TRASH
    priority = 41
    is_hidden = True
    confirmation_message = "Remove this party from the survey?"

    @classmethod
    async def execute(
        cls, obj: Survey, data: RemoveSurveyPartyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(SurveyParty).where(SurveyParty.id == data.survey_party_id, SurveyParty.survey_id == obj.id)
        )
        party = result.scalar_one_or_none()
        if party is None:
            raise NotFoundException()
        await transaction.delete(party)
        return ActionExecutionResponse(message="Party removed")


@survey_actions
class AddFinding(BaseObjectAction[Survey, AddFindingData]):
    action_key = SurveyActionKey.ADD_FINDING
    label = "Add Finding"
    icon = ActionIcon.ADD
    priority = 50

    @classmethod
    async def execute(
        cls, obj: Survey, data: AddFindingData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        finding = Finding(
            survey_id=obj.id,
            title=data.title,
            description=data.description,
            system_area=data.system_area,
            severity=data.severity,
            location_on_vessel=data.location_on_vessel,
            is_pre_existing=data.is_pre_existing,
        )
        transaction.add(finding)
        await transaction.flush()
        return ActionExecutionResponse(message="Finding added", created_id=finding.id)


@survey_actions
class UpdateFinding(BaseObjectAction[Survey, UpdateFindingData]):
    action_key = SurveyActionKey.UPDATE_FINDING
    label = "Edit Finding"
    icon = ActionIcon.EDIT
    priority = 51
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: Survey, data: UpdateFindingData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(Finding).where(Finding.id == data.finding_id, Finding.survey_id == obj.id)
        )
        finding = result.scalar_one_or_none()
        if finding is None:
            raise NotFoundException()
        finding.title = data.title
        finding.description = data.description
        finding.system_area = data.system_area
        finding.severity = data.severity
        finding.location_on_vessel = data.location_on_vessel
        finding.is_pre_existing = data.is_pre_existing
        return ActionExecutionResponse(message="Finding updated")


@survey_actions
class DeleteFinding(BaseObjectAction[Survey, DeleteFindingData]):
    action_key = SurveyActionKey.DELETE_FINDING
    label = "Delete Finding"
    icon = ActionIcon.TRASH
    priority = 52
    is_hidden = True
    confirmation_message = "Delete this finding and all its recommendations?"

    @classmethod
    async def execute(
        cls, obj: Survey, data: DeleteFindingData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(Finding).where(Finding.id == data.finding_id, Finding.survey_id == obj.id)
        )
        finding = result.scalar_one_or_none()
        if finding is None:
            raise NotFoundException()
        await transaction.delete(finding)
        return ActionExecutionResponse(message="Finding deleted")


@survey_actions
class AddRecommendation(BaseObjectAction[Survey, AddRecommendationData]):
    action_key = SurveyActionKey.ADD_RECOMMENDATION
    label = "Add Recommendation"
    icon = ActionIcon.ADD
    priority = 60
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: Survey, data: AddRecommendationData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(Finding).where(Finding.id == data.finding_id, Finding.survey_id == obj.id)
        )
        if result.scalar_one_or_none() is None:
            raise NotFoundException()
        rec = Recommendation(finding_id=data.finding_id, text=data.text, timeframe=data.timeframe)
        transaction.add(rec)
        await transaction.flush()
        return ActionExecutionResponse(message="Recommendation added", created_id=rec.id)


@survey_actions
class UpdateRecommendation(BaseObjectAction[Survey, UpdateRecommendationData]):
    action_key = SurveyActionKey.UPDATE_RECOMMENDATION
    label = "Edit Recommendation"
    icon = ActionIcon.EDIT
    priority = 61
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: Survey, data: UpdateRecommendationData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        finding_result = await transaction.execute(
            select(Finding).where(Finding.id == data.finding_id, Finding.survey_id == obj.id)
        )
        if finding_result.scalar_one_or_none() is None:
            raise NotFoundException()
        result = await transaction.execute(
            select(Recommendation).where(
                Recommendation.id == data.recommendation_id,
                Recommendation.finding_id == data.finding_id,
            )
        )
        rec = result.scalar_one_or_none()
        if rec is None:
            raise NotFoundException()
        rec.text = data.text
        rec.timeframe = data.timeframe
        rec.is_completed = data.is_completed
        return ActionExecutionResponse(message="Recommendation updated")


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
            applies_to_survey_types=data.applies_to_survey_types,
            definition_json=data.definition_json,
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
    async def execute(
        cls, obj: SurveyTemplate, data: UpdateSurveyTemplateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.applies_to_survey_types = data.applies_to_survey_types
        obj.definition_json = data.definition_json
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
