"""LLM tools for vessel lookup."""

from typing import Any

import sqlalchemy as sa
from msgspec import Struct
from sqlalchemy import select

from app.domain.vessels.models import Vessel
from app.platform.llm.registry import SloopTool, ToolContext, ToolResult, register_tool
from app.platform.llm.schemas import InputSchema, PropertySchema
from app.utils.sqids import Sqid


class SearchVesselsInput(Struct):
    query: str
    limit: int = 5


@register_tool
class SearchVesselsTool(SloopTool):
    name = "search_vessels"
    description = "Search vessels by name, HIN, or model. Returns brief summaries."
    input_schema = InputSchema(
        properties={
            "query": PropertySchema(
                type="string", description="Search term matched against vessel name, HIN, or model."
            ),
            "limit": PropertySchema(type="integer", description="Maximum results to return (default 5)."),
        },
        required=["query"],
    )
    input_struct = SearchVesselsInput

    async def execute(self, ctx: ToolContext, args: SearchVesselsInput) -> ToolResult | str:
        pattern = f"%{args.query}%"
        stmt = (
            select(Vessel)
            .where(
                Vessel.organization_id == ctx.user.organization_id,
                sa.or_(
                    Vessel.name.ilike(pattern),
                    Vessel.hin.ilike(pattern),
                    Vessel.model.ilike(pattern),
                ),
            )
            .limit(args.limit)
        )
        result = await ctx.db.execute(stmt)
        vessels = result.scalars().all()

        if not vessels:
            return ToolResult(message="No vessels found matching that query.")

        data: list[dict[str, Any]] = [
            {
                "id": Sqid(v.id),
                "name": v.name,
                "hin": v.hin,
                "model": v.model,
                "year_built": v.year_built,
                "vessel_type": v.vessel_type,
            }
            for v in vessels
        ]
        return ToolResult(data=data)


class GetVesselInput(Struct):
    vessel_id: Sqid


@register_tool
class GetVesselTool(SloopTool):
    name = "get_vessel"
    description = "Get full details for a vessel by ID."
    input_schema = InputSchema(
        properties={
            "vessel_id": PropertySchema(type="string", description="The vessel's SQID."),
        },
        required=["vessel_id"],
    )
    input_struct = GetVesselInput

    async def execute(self, ctx: ToolContext, args: GetVesselInput) -> ToolResult | str:
        stmt = select(Vessel).where(
            Vessel.id == int(args.vessel_id),
            Vessel.organization_id == ctx.user.organization_id,
        )
        result = await ctx.db.execute(stmt)
        vessel = result.scalar_one_or_none()

        if vessel is None:
            return "Vessel not found."

        return ToolResult(
            data={
                "id": Sqid(vessel.id),
                "name": vessel.name,
                "hin": vessel.hin,
                "uscg_official_number": vessel.uscg_official_number,
                "state_registration_number": vessel.state_registration_number,
                "model": vessel.model,
                "year_built": vessel.year_built,
                "vessel_type": vessel.vessel_type,
                "propulsion_type": vessel.propulsion_type,
                "rigging_type": vessel.rigging_type,
                "loa_ft": float(vessel.loa_ft) if vessel.loa_ft is not None else None,
                "beam_ft": float(vessel.beam_ft) if vessel.beam_ft is not None else None,
                "draft_ft": float(vessel.draft_ft) if vessel.draft_ft is not None else None,
                "hull_material": vessel.hull_material,
            }
        )
