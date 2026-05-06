"""Thread enums."""

from enum import StrEnum


class MessageActions(StrEnum):
    """Available actions for messages."""

    update = "update"
    delete = "delete"


class MessageUpdateType(StrEnum):
    """Type of message update."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"


class ThreadSocketMessageType(StrEnum):
    """Types of messages exchanged over the thread WebSocket."""

    MARK_READ = "mark_read"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_FOCUS = "user_focus"
    USER_BLUR = "user_blur"
    MESSAGE_CREATED = "message_created"
    MESSAGE_UPDATED = "message_updated"
    MESSAGE_DELETED = "message_deleted"
