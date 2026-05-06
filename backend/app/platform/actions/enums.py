from enum import StrEnum, auto


class ActionGroupType(StrEnum):
    """Types of action groups. Add domain action groups here as they are implemented."""

    TEST_ACTIONS = auto()


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
