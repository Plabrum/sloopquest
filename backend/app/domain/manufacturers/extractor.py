"""ManufacturerExtractor — looks up a manufacturer by name, creates if missing."""

from __future__ import annotations

from typing import Annotated

from msgspec import Meta, Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.manufacturers.models import Manufacturer
from app.domain.manufacturers.operations import create_manufacturer, get_manufacturer_by_name
from app.platform.extraction.base import BaseExtractor


class ManufacturerSchema(Struct):
    name: Annotated[
        str,
        Meta(description="The boat manufacturer's name as written (e.g. 'Beneteau', 'Catalina Yachts')."),
    ]
    country: Annotated[
        str | None,
        Meta(description="Country of origin if mentioned. Leave null if the document doesn't say."),
    ] = None


class ManufacturerExtractor(BaseExtractor[ManufacturerSchema, Manufacturer]):
    schema = ManufacturerSchema
    model = Manufacturer

    @classmethod
    async def lookup(cls, transaction: AsyncSession, data: ManufacturerSchema) -> Manufacturer | None:
        return await get_manufacturer_by_name(transaction, data.name)

    @classmethod
    async def create(cls, transaction: AsyncSession, data: ManufacturerSchema) -> Manufacturer:
        return await create_manufacturer(
            transaction,
            name=data.name,
            country=data.country,
        )
