"""LLM tools for client lookup."""

from typing import Any

import sqlalchemy as sa
from msgspec import Struct
from sqlalchemy import select

from app.domain.clients.models import Client
from app.platform.llm.registry import SloopTool, ToolContext, ToolResult, register_tool
from app.platform.llm.schemas import InputSchema, PropertySchema
from app.utils.sqids import Sqid


class SearchClientsInput(Struct):
    query: str
    limit: int = 5


@register_tool
class SearchClientsTool(SloopTool):
    name = "search_clients"
    description = "Search clients by name or email."
    input_schema = InputSchema(
        properties={
            "query": PropertySchema(type="string", description="Search term matched against display name or email."),
            "limit": PropertySchema(type="integer", description="Maximum results to return (default 5)."),
        },
        required=["query"],
    )
    input_struct = SearchClientsInput

    async def execute(self, ctx: ToolContext, args: SearchClientsInput) -> ToolResult | str:
        pattern = f"%{args.query}%"
        stmt = (
            select(Client)
            .where(
                Client.organization_id == ctx.user.organization_id,
                sa.or_(
                    Client.display_name.ilike(pattern),
                    Client.email.ilike(pattern),
                ),
            )
            .limit(args.limit)
        )
        result = await ctx.db.execute(stmt)
        clients = result.scalars().all()

        if not clients:
            return ToolResult(message="No clients found matching that query.")

        data: list[dict[str, Any]] = [
            {
                "id": Sqid(c.id),
                "display_name": c.display_name,
                "email": c.email,
                "client_type": c.client_type,
            }
            for c in clients
        ]
        return ToolResult(data=data)
