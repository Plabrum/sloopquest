from enum import Enum


class SurveyState(Enum):
    scheduled = "scheduled"
    in_draft = "in_draft"
    delivered = "delivered"
    cancelled = "cancelled"


class SurveySource(Enum):
    MANUAL = "MANUAL"
    IMPORTED = "IMPORTED"
