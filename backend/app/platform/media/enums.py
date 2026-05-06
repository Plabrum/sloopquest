from enum import StrEnum, auto


class MediaStates(StrEnum):
    """Media processing states."""

    PENDING = auto()
    PROCESSING = auto()
    READY = auto()
    FAILED = auto()
