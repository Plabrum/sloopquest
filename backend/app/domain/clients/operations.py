"""Plain query/persistence helpers — reused by actions and extractors."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.enums import ClientType
from app.domain.clients.models import Client
from app.platform.base.rls_context import current_organization_id


async def get_client_by_email(transaction: AsyncSession, email: str) -> Client | None:
    result = await transaction.execute(sa.select(Client).where(sa.func.lower(Client.email) == email.lower()).limit(1))
    return result.scalar_one_or_none()


async def get_client_by_display_name(transaction: AsyncSession, name: str) -> Client | None:
    result = await transaction.execute(
        sa.select(Client).where(sa.func.lower(Client.display_name) == name.lower()).limit(1)
    )
    return result.scalar_one_or_none()


def derive_individual_display_name(*, first_name: str | None, last_name: str | None) -> str:
    return f"{first_name or ''} {last_name or ''}".strip()


async def create_individual_client(
    transaction: AsyncSession,
    *,
    display_name: str,
    email: str | None = None,
    phone: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> Client:
    client = Client(
        organization_id=await current_organization_id(transaction),
        client_type=ClientType.individual,
        display_name=display_name,
        email=email,
        phone=phone,
        first_name=first_name,
        last_name=last_name,
    )
    transaction.add(client)
    await transaction.flush()
    return client
