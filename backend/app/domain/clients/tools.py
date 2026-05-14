"""LLM tools for client lookup."""

from typing import Any

import sqlalchemy as sa
from msgspec import Struct
from sqlalchemy import select

from app.domain.clients.enums import ClientType
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


class CreateClientInput(Struct):
    client_type: ClientType
    first_name: str | None = None
    last_name: str | None = None
    company_name: str | None = None
    claim_contact_name: str | None = None
    institution_name: str | None = None
    loan_officer_name: str | None = None
    brokerage_name: str | None = None
    agent_name: str | None = None
    license_number: str | None = None
    email: str | None = None
    phone: str | None = None


@register_tool
class CreateClientTool(SloopTool):
    name = "create_client"
    description = (
        "Create a new client. client_type must be one of: individual, insurance_company, lender, broker. "
        "Provide the fields relevant to that type (e.g. first_name/last_name for individual, "
        "company_name for insurance_company, institution_name for lender, brokerage_name/agent_name for broker)."
    )
    input_schema = InputSchema(
        properties={
            "client_type": PropertySchema(
                type="string",
                description="One of: individual, insurance_company, lender, broker.",
            ),
            "first_name": PropertySchema(type="string", description="Individual first name."),
            "last_name": PropertySchema(type="string", description="Individual last name."),
            "company_name": PropertySchema(type="string", description="Insurance company name."),
            "claim_contact_name": PropertySchema(type="string", description="Insurance claim contact name."),
            "institution_name": PropertySchema(type="string", description="Lender institution name."),
            "loan_officer_name": PropertySchema(type="string", description="Lender loan officer name."),
            "brokerage_name": PropertySchema(type="string", description="Broker brokerage name."),
            "agent_name": PropertySchema(type="string", description="Broker agent name."),
            "license_number": PropertySchema(type="string", description="Broker license number."),
            "email": PropertySchema(type="string", description="Contact email."),
            "phone": PropertySchema(type="string", description="Contact phone."),
        },
        required=["client_type"],
    )
    input_struct = CreateClientInput

    async def execute(self, ctx: ToolContext, args: CreateClientInput) -> ToolResult | str:
        match args.client_type:
            case ClientType.individual:
                display_name = f"{args.first_name or ''} {args.last_name or ''}".strip()
            case ClientType.insurance_company:
                display_name = args.company_name or ""
            case ClientType.lender:
                display_name = args.institution_name or ""
            case ClientType.broker:
                display_name = args.brokerage_name or ""
                if args.agent_name:
                    display_name = f"{args.agent_name} ({display_name})"

        if not display_name:
            return "Missing required name field for this client_type."

        client = Client(
            organization_id=ctx.user.organization_id,
            client_type=args.client_type,
            display_name=display_name,
            email=args.email,
            phone=args.phone,
            first_name=args.first_name,
            last_name=args.last_name,
            company_name=args.company_name,
            claim_contact_name=args.claim_contact_name,
            institution_name=args.institution_name,
            loan_officer_name=args.loan_officer_name,
            brokerage_name=args.brokerage_name,
            agent_name=args.agent_name,
            license_number=args.license_number,
        )
        ctx.db.add(client)
        await ctx.db.flush()
        ctx.invalidate_keys.append("/clients")
        return ToolResult(
            message="Client created.",
            data={"id": Sqid(client.id), "display_name": client.display_name},
        )
