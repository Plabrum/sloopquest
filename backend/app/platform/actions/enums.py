from enum import StrEnum, auto


class ActionGroupType(StrEnum):
    """Types of action groups. Add domain action groups here as they are implemented."""

    TEST_ACTIONS = auto()
    VESSEL_ACTIONS = auto()
    CLIENT_ACTIONS = auto()
    SURVEY_ACTIONS = auto()
    SURVEY_TEMPLATE_ACTIONS = auto()
    INVOICE_ACTIONS = auto()
    REPORT_ACTIONS = auto()
    SUBSCRIPTION_ACTIONS = auto()
    ORGANIZATION_ACTIONS = auto()


class ActionResultType(StrEnum):
    """Types of actions the frontend should take after action execution."""

    REDIRECT = auto()
    DOWNLOAD_FILE = auto()


class ActionIcon(StrEnum):
    DEFAULT = auto()
    REFRESH = auto()
    DOWNLOAD = auto()
    SEND = auto()
    EDIT = auto()
    TRASH = auto()
    ADD = auto()
    CHECK = auto()
    X = auto()
