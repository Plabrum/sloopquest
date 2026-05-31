"""SurveyTemplateExtractor — matched-or-created against the workspace's templates."""

from __future__ import annotations

from typing import Annotated

from msgspec import Meta, Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.models import SurveyTemplate
from app.domain.surveys.operations import (
    create_survey_template,
    template_definition_from_sections,
)
from app.domain.surveys.template_matching import (
    ExtractedSection,
    ExtractedTemplate,
    find_matching_template,
)
from app.platform.extraction.base import BaseExtractor


class TemplateSectionSchema(Struct):
    name: Annotated[
        str,
        Meta(description="The section heading as it appears in the survey (e.g. 'Hull', 'Engine')."),
    ]
    field_names: Annotated[
        list[str],
        Meta(description="The labels of every field appearing under this section, in order."),
    ] = []


class TemplateSchema(Struct):
    name: Annotated[
        str,
        Meta(description="A short name for the template this survey was filled out from."),
    ]
    sections: Annotated[
        list[TemplateSectionSchema],
        Meta(description="Every section heading in the survey, with the field labels under each."),
    ] = []


class SurveyTemplateExtractor(BaseExtractor[TemplateSchema, SurveyTemplate]):
    schema = TemplateSchema
    model = SurveyTemplate

    @classmethod
    async def lookup(cls, transaction: AsyncSession, data: TemplateSchema) -> SurveyTemplate | None:
        return await find_matching_template(
            transaction,
            ExtractedTemplate(
                name=data.name,
                sections=[ExtractedSection(name=s.name) for s in data.sections],
            ),
        )

    @classmethod
    async def create(cls, transaction: AsyncSession, data: TemplateSchema) -> SurveyTemplate:
        definition = template_definition_from_sections([(s.name, list(s.field_names)) for s in data.sections])
        return await create_survey_template(
            transaction,
            name=data.name,
            tags=[],
            definition=definition,
        )
