"""msgspec schemas for LLM threads, messages, and tool definitions."""

from datetime import datetime

from msgspec import Struct

from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class MessageSchema(BaseSchema):
    id: Sqid
    thread_id: Sqid
    role: str
    content: str
    created_at: datetime


class CreateThreadBody(BaseSchema):
    content: str


class ThreadCreatedSchema(BaseSchema):
    id: Sqid
    messages: list[MessageSchema]
    created_at: datetime


class SendMessageBody(BaseSchema):
    content: str


class SendMessageResponse(BaseSchema):
    message: MessageSchema


class MessagePageSchema(BaseSchema):
    messages: list[MessageSchema]
    has_more: bool
    next_cursor: Sqid | None


# --- Tool definition schemas (sent to Anthropic) ---


class PropertySchema(Struct, omit_defaults=True):
    type: str
    description: str | None = None
    enum: list[str] | None = None


class InputSchema(Struct):
    type: str = "object"
    properties: dict[str, PropertySchema] = {}
    required: list[str] = []


class ToolDefinition(Struct):
    name: str
    description: str
    input_schema: InputSchema
