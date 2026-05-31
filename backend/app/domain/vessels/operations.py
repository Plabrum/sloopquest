"""Plain query/persistence helpers — reused by actions and extractors."""

from __future__ import annotations

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.vessels.enums import (
    HullMaterial,
    PropulsionType,
    RiggingType,
    VesselType,
)
from app.domain.vessels.models import Vessel
from app.platform.base.rls_context import current_organization_id
from app.utils.sqids import Sqid


async def get_vessel_by_hin(transaction: AsyncSession, hin: str) -> Vessel | None:
    result = await transaction.execute(sa.select(Vessel).where(Vessel.hin == hin).limit(1))
    return result.scalar_one_or_none()


async def create_vessel(
    transaction: AsyncSession,
    *,
    name: str,
    hin: str | None = None,
    uscg_official_number: str | None = None,
    state_registration_number: str | None = None,
    manufacturer_id: Sqid | None = None,
    model: str | None = None,
    year_built: int | None = None,
    vessel_type: VesselType | None = None,
    propulsion_type: PropulsionType | None = None,
    rigging_type: RiggingType | None = None,
    loa_ft: Decimal | None = None,
    beam_ft: Decimal | None = None,
    draft_ft: Decimal | None = None,
    displacement_lbs: Decimal | None = None,
    fuel_capacity_gal: Decimal | None = None,
    hull_material: HullMaterial | None = None,
    construction_notes: str | None = None,
) -> Vessel:
    vessel = Vessel(
        organization_id=await current_organization_id(transaction),
        name=name,
        hin=hin,
        uscg_official_number=uscg_official_number,
        state_registration_number=state_registration_number,
        manufacturer_id=manufacturer_id,
        model=model,
        year_built=year_built,
        vessel_type=vessel_type,
        propulsion_type=propulsion_type,
        rigging_type=rigging_type,
        loa_ft=loa_ft,
        beam_ft=beam_ft,
        draft_ft=draft_ft,
        displacement_lbs=displacement_lbs,
        fuel_capacity_gal=fuel_capacity_gal,
        hull_material=hull_material,
        construction_notes=construction_notes,
    )
    transaction.add(vessel)
    await transaction.flush()
    return vessel
