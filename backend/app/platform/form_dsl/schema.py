from enum import StrEnum, auto

from app.platform.base.schemas import BaseSchema


class FieldType(StrEnum):
    text = auto()
    textarea = auto()
    number = auto()
    select = auto()
    checkbox = auto()


class FormField(BaseSchema):
    id: str
    type: FieldType
    label: str
    required: bool = False
    options: list[str] = []
    unit: str | None = None


class FormSection(BaseSchema):
    id: str
    title: str
    fields: list[FormField]


class FormDefinition(BaseSchema):
    sections: list[FormSection]
