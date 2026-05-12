from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.reports.enums import ReportState
from app.domain.reports.models import Report
from app.domain.reports.schemas import CreateReportData, UpdateReportData
from app.domain.reports.state_machine import report_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.sequences.service import assign_identifier_if_missing


class ReportActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    SUBMIT_FOR_REVIEW = auto()
    DELIVER_WATERMARKED = auto()
    RELEASE = auto()


report_actions = action_group_factory(
    group_type=ActionGroupType.REPORT_ACTIONS,
    default_invalidation="/reports",
    model_type=Report,
)


@report_actions
class CreateReport(BaseTopLevelAction[CreateReportData]):
    action_key = ReportActionKey.CREATE
    label = "Create Report"
    icon = ActionIcon.ADD
    priority = 10
    form_entity_fields = {
        "survey_id": {"model": "Survey", "create_action": None},
    }

    @classmethod
    async def execute(
        cls, data: CreateReportData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        report = Report(
            organization_id=deps.user.organization_id,
            survey_id=data.survey_id,
            title=data.title,
        )
        transaction.add(report)
        await transaction.flush()
        return ActionExecutionResponse(message="Report created", created_id=report.id)


@report_actions
class UpdateReport(BaseObjectAction[Report, UpdateReportData]):
    action_key = ReportActionKey.UPDATE
    label = "Edit Report"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Report, data: UpdateReportData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.title = data.title
        obj.summary = data.summary
        obj.market_value_cents = data.market_value_cents
        obj.replacement_value_cents = data.replacement_value_cents
        return ActionExecutionResponse(message="Report updated")


@report_actions
class DeleteReport(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.DELETE
    label = "Delete Report"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this report?"
    should_redirect_to_parent = True

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return obj.state == ReportState.draft

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Report deleted")


@report_actions
class SubmitReportForReview(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.SUBMIT_FOR_REVIEW
    label = "Submit for Review"
    icon = ActionIcon.SEND
    priority = 30

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.ready_for_review, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await assign_identifier_if_missing(transaction, obj)
        await deps.sm_service.transition(report_state_machine, obj, ReportState.ready_for_review, actor=deps.user)
        return ActionExecutionResponse(message="Report submitted for review")


@report_actions
class DeliverWatermarked(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.DELIVER_WATERMARKED
    label = "Deliver Watermarked"
    icon = ActionIcon.SEND
    priority = 31

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.watermarked_delivered, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(report_state_machine, obj, ReportState.watermarked_delivered, actor=deps.user)
        return ActionExecutionResponse(message="Watermarked report delivered")


@report_actions
class ReleaseReport(BaseObjectAction[Report, EmptyActionData]):
    action_key = ReportActionKey.RELEASE
    label = "Release Report"
    icon = ActionIcon.CHECK
    priority = 32

    @classmethod
    def is_available(cls, obj: Report, deps: ActionDeps) -> bool:
        return report_state_machine.can_transition(obj, ReportState.released, deps.user.role)

    @classmethod
    async def execute(
        cls, obj: Report, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(report_state_machine, obj, ReportState.released, actor=deps.user)
        return ActionExecutionResponse(message="Report released")
