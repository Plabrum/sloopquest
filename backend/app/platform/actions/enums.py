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
    USER_ACTIONS = auto()
    MANUFACTURER_ACTIONS = auto()
    PART_ACTIONS = auto()
    EMAIL_THREAD_ACTIONS = auto()
    MESSAGE_ACTIONS = auto()
    WIDGET_ACTIONS = auto()
    PAYMENT_METHOD_ACTIONS = auto()
    PRICING_GUIDE_ACTIONS = auto()
    CALENDAR_EVENT_ACTIONS = auto()
    SURVEY_MEDIA_ACTIONS = auto()
    SURVEY_FINDING_ACTIONS = auto()
    FORM_NODE_ACTIONS = auto()


class ActionResultType(StrEnum):
    """Types of actions the frontend should take after action execution."""

    REDIRECT = auto()
    DOWNLOAD_FILE = auto()
    COPY_TO_CLIPBOARD = auto()


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
    LINK = auto()
    CALENDAR = auto()
    PLAY = auto()
    CLIPBOARD = auto()
    REWIND = auto()
