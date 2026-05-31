from enum import StrEnum, auto


class TaskName(StrEnum):
    HEALTH_CHECK = auto()
    SEND_EMAIL = auto()
    PROCESS_INBOUND_EMAIL = auto()
    HANDLE_SURVEYS_EMAIL = auto()
    HANDLE_SUPPORT_EMAIL = auto()
    SEND_UNKNOWN_RECIPIENT_BOUNCE = auto()
    RUN_EVENT_CONSUMER = auto()
    GENERATE_THUMBNAIL = auto()
    EMBED_ROW = auto()
    SWEEP_EMBEDDINGS = auto()
    IMPORT_SURVEY_FROM_PDF = auto()
    IMPORT_SURVEYS_FROM_EMAIL = auto()


class TaskRoleType(StrEnum):
    USER = auto()
    SYSTEM = auto()


class TaskStatus(StrEnum):
    PENDING = auto()
    ACTIVE = auto()
    COMPLETE = auto()
    FAILED = auto()
    ABORTED = auto()
