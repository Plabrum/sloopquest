from enum import StrEnum, auto


class EmailMessageStatus(StrEnum):
    PENDING = auto()
    SENT = auto()
    FAILED = auto()
