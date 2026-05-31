"""ClientExtractor — vessel owner from a survey document.

Only the individual-client shape is materialized. Surveys are sent by
brokers/insurance reviewers for individual boat owners; the other ClientType
variants are workflow constructs from the manual flow and aren't extracted.
"""

from __future__ import annotations

from typing import Annotated

from msgspec import Meta, Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.models import Client
from app.domain.clients.operations import (
    create_individual_client,
    derive_individual_display_name,
    get_client_by_display_name,
    get_client_by_email,
)
from app.platform.extraction.base import BaseExtractor


class ClientSchema(Struct):
    name: Annotated[
        str,
        Meta(description="The vessel owner's full name (first and last)."),
    ]
    email: Annotated[
        str | None,
        Meta(description="The owner's email address if printed on the document."),
    ] = None
    phone: Annotated[
        str | None,
        Meta(description="The owner's phone number if printed on the document."),
    ] = None


class ClientExtractor(BaseExtractor[ClientSchema, Client]):
    schema = ClientSchema
    model = Client

    @classmethod
    async def lookup(cls, transaction: AsyncSession, data: ClientSchema) -> Client | None:
        if data.email:
            existing = await get_client_by_email(transaction, data.email)
            if existing is not None:
                return existing
        return await get_client_by_display_name(transaction, data.name)

    @classmethod
    async def create(cls, transaction: AsyncSession, data: ClientSchema) -> Client:
        first, _, last = data.name.partition(" ")
        return await create_individual_client(
            transaction,
            display_name=derive_individual_display_name(first_name=first, last_name=last) or data.name,
            email=data.email,
            phone=data.phone,
            first_name=first or None,
            last_name=last or None,
        )
