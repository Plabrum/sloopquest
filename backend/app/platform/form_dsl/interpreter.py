from typing import Literal

import msgspec

from app.platform.form_dsl.schema import FieldType, FormDefinition, FormField


def build_response_struct(definition: FormDefinition) -> type:
    fields = []
    for section in definition.sections:
        for field in section.fields:
            t = _python_type(field)
            if field.required:
                fields.append((field.id, t))
            else:
                fields.append((field.id, t | None, None))
    return msgspec.defstruct("FormResponse", fields)


def _python_type(field: FormField) -> type:
    match field.type:
        case FieldType.number:
            return float
        case FieldType.checkbox:
            return bool
        case FieldType.select:
            return Literal[tuple(field.options)] if field.options else str  # type: ignore[return-value]
        case _:
            return str
