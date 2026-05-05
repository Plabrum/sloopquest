from enum import StrEnum, auto


class TaskName(StrEnum):
    HEALTH_CHECK = auto()


class TaskRoleType(StrEnum):
    USER = auto()
    SYSTEM = auto()


class TaskStatus(StrEnum):
    PENDING = auto()
    ACTIVE = auto()
    COMPLETE = auto()
    FAILED = auto()
    ABORTED = auto()
