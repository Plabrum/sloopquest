"""Loose validation of free-form response payloads against a TemplateDefinition.

`survey_nodes` is the source of truth for response data going forward — this
helper only exists to keep the legacy `SaveSurveyResponse` action working
during the transition.
"""

from datetime import date
from typing import Any, Literal

import msgspec

from app.platform.form_dsl.schema import FieldDef, FieldType, TemplateDefinition


def build_response_struct(definition: TemplateDefinition) -> type:
    fields: list[tuple] = []
    for section in definition.sections:
        for sub in section.subsections:
            for field in sub.fields:
                t = _python_type(field)
                if field.required:
                    fields.append((_safe_name(field.id), t))
                else:
                    fields.append((_safe_name(field.id), t | None, None))
    return msgspec.defstruct("FormResponse", fields)


def _safe_name(field_id: str) -> str:
    return field_id.replace("-", "_")


def _python_type(field: FieldDef) -> type:
    match field.type:
        case FieldType.NUMBER | FieldType.CURRENCY:
            return float
        case FieldType.BOOLEAN:
            return bool
        case FieldType.SELECT | FieldType.SEGMENTED:
            options = field.config.get("options") or []
            return Literal[tuple(options)] if options else str  # type: ignore[return-value]
        case FieldType.MULTISELECT:
            return list[str]
        case FieldType.DATE:
            return date
        case FieldType.PHOTO:
            return list[str]
        case FieldType.REPEATER:
            return list[dict[str, Any]]
        case FieldType.TABLE | FieldType.SIGNATURE | FieldType.ANNOTATED_IMAGE:
            return dict[str, Any]
        case _:
            return str
