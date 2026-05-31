"""End-to-end tests for the Manufacturer and Vessel extractors.

Exercises the `run()` path (no LLM) against a real RLS-scoped transaction.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.manufacturers.extractor import ManufacturerExtractor, ManufacturerSchema
from app.domain.manufacturers.operations import create_manufacturer
from app.domain.vessels.extractor import VesselExtractor, VesselSchema


@pytest.mark.asyncio
async def test_manufacturer_extractor_creates_when_not_found(transaction: AsyncSession):
    result = await ManufacturerExtractor.run(transaction, ManufacturerSchema(name="Beneteau", country="France"))
    assert result.name == "Beneteau"
    assert result.country == "France"
    assert result.id is not None


@pytest.mark.asyncio
async def test_manufacturer_extractor_returns_existing(transaction: AsyncSession):
    existing = await create_manufacturer(transaction, name="Catalina")
    result = await ManufacturerExtractor.run(
        transaction,
        ManufacturerSchema(name="catalina"),  # case-insensitive match
    )
    assert result.id == existing.id


@pytest.mark.asyncio
async def test_vessel_extractor_creates_with_nested_manufacturer(transaction: AsyncSession):
    data = VesselSchema(
        name="Wanderer",
        model="42",
        year_built=2010,
        hin="TEST00000A010",
        loa_ft=42.5,
        manufacturer=ManufacturerSchema(name="Hallberg-Rassy"),
    )
    vessel = await VesselExtractor.run(transaction, data)
    assert vessel.name == "Wanderer"
    assert vessel.hin == "TEST00000A010"
    assert vessel.manufacturer_id is not None
    assert vessel.loa_ft is not None
    assert float(vessel.loa_ft) == 42.5


@pytest.mark.asyncio
async def test_vessel_extractor_lookup_by_hin(transaction: AsyncSession):
    first = await VesselExtractor.run(
        transaction,
        VesselSchema(name="First", hin="UNIQUEHIN12345"),
    )
    second = await VesselExtractor.run(
        transaction,
        VesselSchema(name="Different", hin="UNIQUEHIN12345"),
    )
    assert first.id == second.id
    # New extracted name is silently ignored on lookup hit (mutation policy).
    assert second.name == "First"


@pytest.mark.asyncio
async def test_vessel_extractor_without_manufacturer(transaction: AsyncSession):
    vessel = await VesselExtractor.run(transaction, VesselSchema(name="Solo", hin="SOLOHIN0001"))
    assert vessel.manufacturer_id is None
