"""VesselExtractor — looks up by HIN, falls through to create + nested manufacturer."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from msgspec import Meta, Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.manufacturers.extractor import ManufacturerExtractor, ManufacturerSchema
from app.domain.vessels.models import Vessel
from app.domain.vessels.operations import create_vessel, get_vessel_by_hin
from app.platform.extraction.base import BaseExtractor


class VesselSchema(Struct):
    name: Annotated[
        str,
        Meta(description="The vessel's name as written on the survey (e.g. 'S/V Wanderer')."),
    ]
    model: Annotated[
        str | None,
        Meta(description="Model designation from the builder (e.g. '42', 'Catalina 350')."),
    ] = None
    year_built: Annotated[
        int | None,
        Meta(description="Model year the vessel was built. Four-digit year."),
    ] = None
    hin: Annotated[
        str | None,
        Meta(description="Hull Identification Number — 12-character alphanumeric ID stamped on the transom."),
    ] = None
    loa_ft: Annotated[
        float | None,
        Meta(description="Length overall in feet. If the document gives meters, convert to feet."),
    ] = None
    manufacturer: Annotated[
        ManufacturerSchema | None,
        Meta(description="The builder / manufacturer if identifiable from the document."),
    ] = None


class VesselExtractor(BaseExtractor[VesselSchema, Vessel]):
    schema = VesselSchema
    model = Vessel

    @classmethod
    async def lookup(cls, transaction: AsyncSession, data: VesselSchema) -> Vessel | None:
        if data.hin:
            return await get_vessel_by_hin(transaction, data.hin)
        return None

    @classmethod
    async def create(cls, transaction: AsyncSession, data: VesselSchema) -> Vessel:
        manufacturer = (
            await ManufacturerExtractor.run(transaction, data.manufacturer) if data.manufacturer is not None else None
        )
        return await create_vessel(
            transaction,
            name=data.name,
            hin=data.hin,
            model=data.model,
            year_built=data.year_built,
            loa_ft=Decimal(str(data.loa_ft)) if data.loa_ft is not None else None,
            manufacturer_id=manufacturer.id if manufacturer is not None else None,
        )
