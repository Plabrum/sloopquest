"""Plain query/persistence helpers for surveys + survey templates.

Shared by the survey actions and the extraction platform. Lift any logic out
of an action's `execute` body into here when a second caller needs it.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import msgspec
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.enums import SurveySource, SurveyState
from app.domain.surveys.models import Survey, SurveyTemplate
from app.platform.base.rls_context import current_organization_id, current_user_id
from app.platform.form_dsl.schema import (
    FieldDef,
    FieldType,
    Section,
    TemplateDefinition,
)
from app.utils.sqids import Sqid

if TYPE_CHECKING:
    from app.platform.comms.models.messages import Message


async def create_survey_template(
    transaction: AsyncSession,
    *,
    name: str,
    tags: list[str] | None = None,
    definition: TemplateDefinition,
) -> SurveyTemplate:
    template = SurveyTemplate(
        organization_id=await current_organization_id(transaction),
        name=name,
        tags=tags or [],
        definition=msgspec.to_builtins(definition),
    )
    transaction.add(template)
    await transaction.flush()
    return template


def template_definition_from_sections(
    sections: list[tuple[str, list[str]]],
) -> TemplateDefinition:
    """Build a `TemplateDefinition` from `(section_title, [field_label, ...])` pairs.

    Used by the extractor — the LLM only gives us names; we synthesize stable
    IDs from them and default every field to TEXT. The existing form-DSL
    consumers can render the result as-is.
    """
    section_defs: list[Section] = []
    for s_idx, (title, field_labels) in enumerate(sections):
        fields = [
            FieldDef(
                id=_slug(label, f"s{s_idx}_f{f_idx}"),
                label=label,
                type=FieldType.TEXT,
            )
            for f_idx, label in enumerate(field_labels)
        ]
        section_defs.append(Section(id=_slug(title, f"section_{s_idx}"), title=title, fields=fields))
    return TemplateDefinition(sections=section_defs)


def _slug(text: str, fallback: str) -> str:
    out = "".join(c if c.isalnum() else "_" for c in text.strip().lower()).strip("_")
    return out or fallback


async def create_imported_survey(
    transaction: AsyncSession,
    *,
    vessel_id: Sqid,
    template_id: Sqid | None,
    source_message: Message | None = None,
    source_attachment_index: int | None = None,
) -> Survey:
    """Persist an imported survey in COMPLETED-equivalent state.

    Sloopquest's `SurveyState` uses `delivered` as the terminal post-survey
    state (no explicit COMPLETED state exists). Imports land directly there
    with the IMPORTED source flag.
    """
    survey = Survey(
        organization_id=await current_organization_id(transaction),
        vessel_id=vessel_id,
        assigned_surveyor_id=await current_user_id(transaction),
        template_id=template_id,
        state=SurveyState.delivered.name,
        source=SurveySource.IMPORTED,
        source_message_id=source_message.id if source_message is not None else None,
        source_attachment_index=source_attachment_index,
    )
    transaction.add(survey)
    await transaction.flush()
    return survey


async def get_existing_imported_survey(
    transaction: AsyncSession,
    *,
    source_message_id: Sqid,
    source_attachment_index: int,
) -> Survey | None:
    """Idempotency lookup — returns the prior import for this message+attachment, if any."""
    result = await transaction.execute(
        sa.select(Survey)
        .where(
            Survey.source == SurveySource.IMPORTED,
            Survey.source_message_id == source_message_id,
            Survey.source_attachment_index == source_attachment_index,
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


__all__ = [
    "create_survey_template",
    "create_imported_survey",
    "get_existing_imported_survey",
    "template_definition_from_sections",
]
