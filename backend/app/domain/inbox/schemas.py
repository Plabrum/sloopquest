from __future__ import annotations

from datetime import datetime

from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.platform.comms.enums import MessageDirection, MessageState
from app.utils.sqids import Sqid


class AttachmentRef(BaseSchema):
    filename: str
    content_type: str | None = None
    size: int | None = None
    s3_key: str | None = None


class ThreadListItem(ActionableList):
    id: Sqid
    subject: str | None
    latest_from: str | None
    latest_snippet: str | None
    latest_activity_at: datetime
    latest_direction: MessageDirection | None
    unread_count: int
    archived_at: datetime | None
    client_id: Sqid | None
    survey_id: Sqid | None


class ThreadDetail(ActionableDetail):
    id: Sqid
    subject: str | None
    latest_from: str | None
    latest_snippet: str | None
    latest_activity_at: datetime
    unread_count: int
    archived_at: datetime | None
    client_id: Sqid | None
    survey_id: Sqid | None


class MessageListItem(ActionableList):
    id: Sqid
    email_thread_id: Sqid | None
    direction: MessageDirection
    state: MessageState
    subject: str | None
    from_email: str | None
    snippet: str | None
    received_at: datetime | None
    sent_at: datetime | None
    read_at: datetime | None
    archived_at: datetime | None


class MessageDetail(ActionableDetail):
    id: Sqid
    email_thread_id: Sqid | None
    direction: MessageDirection
    state: MessageState
    subject: str | None
    from_email: str | None
    snippet: str | None
    received_at: datetime | None
    sent_at: datetime | None
    read_at: datetime | None
    archived_at: datetime | None
    body_html: str | None
    body_text: str | None
    to_emails: list[str]
    attachments: list[AttachmentRef]


class ComposeData(BaseSchema):
    to: list[str]
    subject: str
    body_text: str
    body_html: str | None = None


class ReplyData(BaseSchema):
    email_thread_id: Sqid
    body_text: str
    body_html: str | None = None


class AttachClientData(BaseSchema):
    client_id: Sqid


class AttachSurveyData(BaseSchema):
    survey_id: Sqid


class ForwardData(BaseSchema):
    to: list[str]
    body_text: str
    body_html: str | None = None
