"""SurveyExtractor — top-level extractor for historic survey imports.

Composes Client + Vessel + Template siblings in dependency order and
persists the resulting Survey with `source=IMPORTED`. Provenance fields
(source_message_id, source_attachment_index) are NOT set here — the caller
stamps them on the returned row, since they describe ingress, not document
content. Response materialization against survey nodes is left to a
follow-up — extracted `responses` are accepted but not yet inserted.

The substantive prompt lives with the caller (`domain/surveys/tasks.py`),
not on the extractor — per-field guidance is on the schemas via
`Annotated[T, Meta(description=...)]`.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

from msgspec import Meta, Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.extractor import ClientExtractor, ClientSchema
from app.domain.surveys.extractor import SurveyTemplateExtractor, TemplateSchema
from app.domain.surveys.models import Survey
from app.domain.surveys.operations import create_imported_survey
from app.domain.vessels.extractor import VesselExtractor, VesselSchema
from app.platform.extraction.base import BaseExtractor


class SurveyResponseSchema(Struct):
    section_name: Annotated[
        str, Meta(description="The section this response was under (matches a TemplateSectionSchema.name).")
    ]
    field_name: Annotated[
        str, Meta(description="The label of the field whose value this is (matches a field under that section).")
    ]
    value: Annotated[
        str, Meta(description="The value the surveyor entered, as a string. Convert numbers/dates verbatim.")
    ]


class SurveySchema(Struct):
    client: Annotated[ClientSchema, Meta(description="The vessel owner this survey was performed for.")]
    vessel: Annotated[VesselSchema, Meta(description="The vessel that was surveyed.")]
    template: Annotated[TemplateSchema, Meta(description="The template structure the survey was filled against.")]
    responses: Annotated[
        list[SurveyResponseSchema],
        Meta(description="Every filled-in field response in the survey."),
    ] = []
    surveyor: Annotated[
        str | None,
        Meta(description="Name of the surveyor who performed the survey, if signed/printed."),
    ] = None
    surveyed_on: Annotated[
        date | None,
        Meta(description="Date the survey was performed, if stated. ISO 8601 (YYYY-MM-DD)."),
    ] = None
    location: Annotated[
        str | None,
        Meta(description="Where the survey was performed (marina / city), if stated."),
    ] = None


class SurveyExtractor(BaseExtractor[SurveySchema, Survey]):
    schema = SurveySchema
    model = Survey

    @classmethod
    async def create(cls, transaction: AsyncSession, data: SurveySchema) -> Survey:
        # Dependency order: client → vessel → template. None of these depend on
        # the survey row, so order is informational (in case we later want to
        # link vessel→client at this layer).
        await ClientExtractor.run(transaction, data.client)
        vessel = await VesselExtractor.run(transaction, data.vessel)
        template = await SurveyTemplateExtractor.run(transaction, data.template)
        return await create_imported_survey(
            transaction,
            vessel_id=vessel.id,
            template_id=template.id,
        )
