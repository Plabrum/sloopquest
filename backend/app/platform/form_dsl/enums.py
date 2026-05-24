from enum import Enum


class FormNodeKind(Enum):
    section = "section"
    subsection = "subsection"
    field = "field"
    repeater_instance = "repeater_instance"
    # Domain-specific sub-entry (e.g. a survey finding). Owners interpret the
    # `value` payload; the platform treats it as an opaque tree node.
    annotation = "annotation"
