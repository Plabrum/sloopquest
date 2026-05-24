from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import joinedload, undefer

from app.domain.inbox.schemas import (
    AttachmentRef,
    MessageDetail,
    MessageListItem,
    ThreadDetail,
    ThreadListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message

_SNIPPET_CHARS = 160


def _snippet(text: str | None) -> str | None:
    if not text:
        return None
    body = text.strip()
    if len(body) <= _SNIPPET_CHARS:
        return body
    return body[:_SNIPPET_CHARS].rstrip() + "…"


def _to_attachments(raw: dict | None) -> list[AttachmentRef]:
    if not raw:
        return []
    items = raw.get("attachments") if isinstance(raw, dict) else None
    if not items:
        return []
    return [
        AttachmentRef(
            filename=item.get("filename", ""),
            content_type=item.get("content_type"),
            size=item.get("size"),
            s3_key=item.get("s3_key"),
        )
        for item in items
    ]


def _to_thread_list_item(t: EmailThread, _u: User) -> ThreadListItem:
    msg = t.latest_message
    return ThreadListItem(
        id=t.id,
        subject=t.subject,
        latest_from=(msg.from_name or msg.from_email) if msg else None,
        latest_snippet=_snippet(msg.body_text) if msg else None,
        latest_activity_at=msg.created_at if msg else t.updated_at,
        latest_direction=msg.direction if msg else None,
        unread_count=t.unread_count or 0,
        archived_at=t.archived_at,
        client_id=t.client_id,
        survey_id=t.survey_id,
    )


def _to_thread_detail(t: EmailThread, _u: User) -> ThreadDetail:
    msg = t.latest_message
    return ThreadDetail(
        id=t.id,
        subject=t.subject,
        latest_from=(msg.from_name or msg.from_email) if msg else None,
        latest_snippet=_snippet(msg.body_text) if msg else None,
        latest_activity_at=msg.created_at if msg else t.updated_at,
        unread_count=t.unread_count or 0,
        archived_at=t.archived_at,
        client_id=t.client_id,
        survey_id=t.survey_id,
    )


def _to_message_list_item(m: Message, _u: User) -> MessageListItem:
    return MessageListItem(
        id=m.id,
        email_thread_id=m.email_thread_id,
        direction=MessageDirection(m.direction) if isinstance(m.direction, str) else m.direction,
        state=MessageState(m.state) if isinstance(m.state, str) else m.state,
        subject=m.subject,
        from_email=m.from_email,
        snippet=_snippet(m.body_text),
        received_at=m.received_at,
        sent_at=m.sent_at,
        read_at=m.read_at,
        archived_at=m.archived_at,
    )


def _to_message_detail(m: Message, _u: User) -> MessageDetail:
    return MessageDetail(
        id=m.id,
        email_thread_id=m.email_thread_id,
        direction=MessageDirection(m.direction) if isinstance(m.direction, str) else m.direction,
        state=MessageState(m.state) if isinstance(m.state, str) else m.state,
        subject=m.subject,
        from_email=m.from_email,
        snippet=_snippet(m.body_text),
        received_at=m.received_at,
        sent_at=m.sent_at,
        read_at=m.read_at,
        archived_at=m.archived_at,
        body_html=m.body_html,
        body_text=m.body_text,
        to_emails=list(m.to_emails or []),
        attachments=_to_attachments(m.attachments_json),
    )


_thread_load_options = [
    joinedload(EmailThread.latest_message),
    undefer(EmailThread.unread_count),
]


_thread_config = CRUDConfig(
    model=EmailThread,
    scope="user",
    to_list_item=_to_thread_list_item,
    to_detail=_to_thread_detail,
    list_load_options=_thread_load_options,
    detail_load_options=_thread_load_options,
    filterable_columns={"client_id", "survey_id", "archived_at", "has_unread_inbound", "has_outbound"},
    sortable_columns={"created_at", "updated_at"},
    default_sort="updated_at",
)


_message_config = CRUDConfig(
    model=Message,
    scope="user",
    to_list_item=_to_message_list_item,
    to_detail=_to_message_detail,
    filterable_columns={"email_thread_id", "direction", "state", "read_at", "archived_at"},
    sortable_columns={"created_at", "received_at", "sent_at"},
    default_sort="created_at",
)


_email_thread_controller = make_crud_controller("", _thread_config)

email_thread_router = Router(
    path="/email-threads",
    route_handlers=[_email_thread_controller],
    tags=["inbox"],
)
message_router = Router(
    path="/messages",
    route_handlers=[make_crud_controller("", _message_config)],
    tags=["inbox"],
)
