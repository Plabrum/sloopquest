"""LLM tools for survey lookup."""

from typing import Any

from msgspec import Struct
from sqlalchemy import select

from app.domain.surveys.models import Survey, SurveyTemplate
from app.domain.users.models import User
from app.domain.vessels.models import Vessel
from app.platform.llm.registry import SloopTool, ToolContext, ToolResult, register_tool
from app.platform.llm.schemas import InputSchema, PropertySchema
from app.utils.sqids import Sqid


class ListSurveysInput(Struct):
    vessel_id: Sqid | None = None
    state: str | None = None
    limit: int = 10


@register_tool
class ListSurveysTool(SloopTool):
    name = "list_surveys"
    description = "List surveys, optionally filtered by vessel ID or state."
    input_schema = InputSchema(
        properties={
            "vessel_id": PropertySchema(type="string", description="Filter by vessel SQID (optional)."),
            "state": PropertySchema(type="string", description="Filter by survey state (optional)."),
            "limit": PropertySchema(type="integer", description="Maximum results to return (default 10)."),
        },
    )
    input_struct = ListSurveysInput

    async def execute(self, ctx: ToolContext, args: ListSurveysInput) -> ToolResult | str:
        stmt = (
            select(Survey, Vessel.name.label("vessel_name"))
            .join(Vessel, Survey.vessel_id == Vessel.id)
            .where(Survey.organization_id == ctx.user.organization_id)
            .order_by(Survey.created_at.desc())
            .limit(args.limit)
        )
        if args.vessel_id is not None:
            stmt = stmt.where(Survey.vessel_id == int(args.vessel_id))
        if args.state is not None:
            stmt = stmt.where(Survey.state == args.state)

        result = await ctx.db.execute(stmt)
        rows = result.all()

        if not rows:
            return ToolResult(message="No surveys found.")

        data: list[dict[str, Any]] = [
            {
                "id": Sqid(survey.id),
                "state": survey.state,
                "vessel_name": vessel_name,
                "created_at": survey.created_at.isoformat(),
            }
            for survey, vessel_name in rows
        ]
        return ToolResult(data=data)


class GetSurveyInput(Struct):
    survey_id: Sqid


@register_tool
class GetSurveyTool(SloopTool):
    name = "get_survey"
    description = "Get details for a specific survey by ID."
    input_schema = InputSchema(
        properties={
            "survey_id": PropertySchema(type="string", description="The survey's SQID."),
        },
        required=["survey_id"],
    )
    input_struct = GetSurveyInput

    async def execute(self, ctx: ToolContext, args: GetSurveyInput) -> ToolResult | str:

        stmt = (
            select(
                Survey,
                Vessel.name.label("vessel_name"),
                User.name.label("surveyor_name"),
                SurveyTemplate.name.label("template_name"),
            )
            .join(Vessel, Survey.vessel_id == Vessel.id)
            .join(User, Survey.assigned_surveyor_id == User.id)
            .outerjoin(SurveyTemplate, Survey.template_id == SurveyTemplate.id)
            .where(
                Survey.id == int(args.survey_id),
                Survey.organization_id == ctx.user.organization_id,
            )
        )
        result = await ctx.db.execute(stmt)
        row = result.one_or_none()

        if row is None:
            return "Survey not found."

        survey, vessel_name, surveyor_name, template_name = row
        return ToolResult(
            data={
                "id": Sqid(survey.id),
                "state": survey.state,
                "vessel_name": vessel_name,
                "surveyor_name": surveyor_name,
                "template_name": template_name,
                "created_at": survey.created_at.isoformat(),
            }
        )
