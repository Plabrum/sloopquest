"""Plain query/persistence helpers — reused by actions and extractors."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.manufacturers.models import Manufacturer
from app.platform.base.rls_context import current_organization_id


async def get_manufacturer_by_name(transaction: AsyncSession, name: str) -> Manufacturer | None:
    result = await transaction.execute(
        sa.select(Manufacturer).where(sa.func.lower(Manufacturer.name) == name.lower()).limit(1)
    )
    return result.scalar_one_or_none()


async def create_manufacturer(
    transaction: AsyncSession,
    *,
    name: str,
    country: str | None = None,
    website: str | None = None,
) -> Manufacturer:
    manufacturer = Manufacturer(
        organization_id=await current_organization_id(transaction),
        name=name,
        country=country,
        website=website,
    )
    transaction.add(manufacturer)
    await transaction.flush()
    return manufacturer
