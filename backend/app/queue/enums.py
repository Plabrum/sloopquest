from enum import StrEnum, auto


class TaskName(StrEnum):
    HEALTH_CHECK = auto()
    SEND_EMAIL = auto()
    PROCESS_INBOUND_EMAIL = auto()
    HANDLE_SURVEYS_EMAIL = auto()
    HANDLE_SUPPORT_EMAIL = auto()


class TaskRoleType(StrEnum):
    USER = auto()
    SYSTEM = auto()


class TaskStatus(StrEnum):
    PENDING = auto()
    ACTIVE = auto()
    COMPLETE = auto()
    FAILED = auto()
    ABORTED = auto()
