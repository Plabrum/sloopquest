from __future__ import annotations

import logging
from datetime import UTC, datetime
from enum import StrEnum, auto

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.inbox.schemas import (
    AttachClientData,
    AttachSurveyData,
    ComposeData,
    ForwardData,
    ReplyData,
)
from app.platform.actions.base import (
    BaseObjectAction,
    BaseTopLevelAction,
    EmptyActionData,
    action_group_factory,
)
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message
from app.platform.comms.state_machine import message_state_machine
from app.platform.queue.enums import TaskName
from app.platform.queue.transactions import dispatch_task

logger = logging.getLogger(__name__)


class EmailThreadActionKey(StrEnum):
    COMPOSE = auto()
    ARCHIVE_THREAD = auto()
    UNARCHIVE_THREAD = auto()
    MARK_THREAD_READ = auto()
    MARK_THREAD_UNREAD = auto()
    ATTACH_TO_CLIENT = auto()
    ATTACH_TO_SURVEY = auto()


class MessageActionKey(StrEnum):
    MARK_READ = auto()
    MARK_UNREAD = auto()
    ARCHIVE_MESSAGE = auto()
    UNARCHIVE_MESSAGE = auto()
    RESEND_MESSAGE = auto()
    FORWARD_MESSAGE = auto()
    REPLY_TO_THREAD = auto()


email_thread_actions = action_group_factory(
    group_type=ActionGroupType.EMAIL_THREAD_ACTIONS,
    default_invalidation="/email-threads",
    model_type=EmailThread,
)

message_actions = action_group_factory(
    group_type=ActionGroupType.MESSAGE_ACTIONS,
    default_invalidation="/messages",
    model_type=Message,
)


def _from_email() -> str:
    return config.SES_FROM_EMAIL


def _from_name() -> str | None:
    return config.SES_FROM_NAME


async def _thread_messages(transaction: AsyncSession, thread_id: int) -> list[Message]:
    result = await transaction.execute(
        select(Message).where(Message.email_thread_id == thread_id).order_by(Message.created_at.desc())
    )
    return list(result.scalars().all())


def _now() -> datetime:
    return datetime.now(tz=UTC)


# ── EmailThread actions ──────────────────────────────────────────────────────


@email_thread_actions
class ComposeNewEmail(BaseTopLevelAction[ComposeData]):
    action_key = EmailThreadActionKey.COMPOSE
    label = "New Email"
    icon = ActionIcon.SEND
    priority = 10

    @classmethod
    async def execute(cls, data: ComposeData, transaction: AsyncSession, deps: ActionDeps) -> ActionExecutionResponse:
        thread = EmailThread(user_id=deps.user.id, subject=data.subject)
        transaction.add(thread)
        await transaction.flush()

        message = Message(
            user_id=deps.user.id,
            email_thread_id=thread.id,
            direction=MessageDirection.OUT,
            state=MessageState.QUEUED,
            subject=data.subject,
            to_emails=list(data.to),
            from_email=_from_email(),
            from_name=_from_name(),
            body_text=data.body_text,
            body_html=data.body_html or data.body_text,
        )
        transaction.add(message)
        await transaction.flush()

        await dispatch_task(transaction, deps.request, TaskName.SEND_EMAIL, message_id=message.id)
        return ActionExecutionResponse(message="Email queued", created_id=thread.id)


@email_thread_actions
class ArchiveThread(BaseObjectAction[EmailThread, EmptyActionData]):
    action_key = EmailThreadActionKey.ARCHIVE_THREAD
    label = "Archive"
    icon = ActionIcon.TRASH
    priority = 30

    @classmethod
    def is_available(cls, obj: EmailThread, deps: ActionDeps) -> bool:
        return obj.archived_at is None

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        now = _now()
        obj.archived_at = now
        for m in await _thread_messages(transaction, obj.id):
            m.archived_at = now
        return ActionExecutionResponse(message="Thread archived")


@email_thread_actions
class UnarchiveThread(BaseObjectAction[EmailThread, EmptyActionData]):
    action_key = EmailThreadActionKey.UNARCHIVE_THREAD
    label = "Unarchive"
    icon = ActionIcon.REFRESH
    priority = 30

    @classmethod
    def is_available(cls, obj: EmailThread, deps: ActionDeps) -> bool:
        return obj.archived_at is not None

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.archived_at = None
        for m in await _thread_messages(transaction, obj.id):
            m.archived_at = None
        return ActionExecutionResponse(message="Thread unarchived")


@email_thread_actions
class MarkThreadRead(BaseObjectAction[EmailThread, EmptyActionData]):
    action_key = EmailThreadActionKey.MARK_THREAD_READ
    label = "Mark read"
    icon = ActionIcon.CHECK
    priority = 40

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        now = _now()
        for m in await _thread_messages(transaction, obj.id):
            if m.read_at is None:
                m.read_at = now
        return ActionExecutionResponse(message="Marked read")


@email_thread_actions
class MarkThreadUnread(BaseObjectAction[EmailThread, EmptyActionData]):
    action_key = EmailThreadActionKey.MARK_THREAD_UNREAD
    label = "Mark unread"
    icon = ActionIcon.REFRESH
    priority = 40

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        for m in await _thread_messages(transaction, obj.id):
            m.read_at = None
        return ActionExecutionResponse(message="Marked unread")


@email_thread_actions
class AttachToClient(BaseObjectAction[EmailThread, AttachClientData]):
    action_key = EmailThreadActionKey.ATTACH_TO_CLIENT
    label = "Attach to client"
    icon = ActionIcon.ADD
    priority = 50

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: AttachClientData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.client_id = data.client_id
        return ActionExecutionResponse(message="Attached to client")


@email_thread_actions
class AttachToSurvey(BaseObjectAction[EmailThread, AttachSurveyData]):
    action_key = EmailThreadActionKey.ATTACH_TO_SURVEY
    label = "Attach to survey"
    icon = ActionIcon.ADD
    priority = 50

    @classmethod
    async def execute(
        cls, obj: EmailThread, data: AttachSurveyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.survey_id = data.survey_id
        return ActionExecutionResponse(message="Attached to survey")


# ── Message actions ──────────────────────────────────────────────────────────


@message_actions
class ReplyToThread(BaseTopLevelAction[ReplyData]):
    action_key = MessageActionKey.REPLY_TO_THREAD
    label = "Reply"
    icon = ActionIcon.SEND
    priority = 5

    @classmethod
    async def execute(cls, data: ReplyData, transaction: AsyncSession, deps: ActionDeps) -> ActionExecutionResponse:
        thread = await transaction.get(EmailThread, data.email_thread_id)
        if thread is None:
            return ActionExecutionResponse(message="Thread not found")

        latest_inbound = await transaction.scalar(
            select(Message)
            .where(
                Message.email_thread_id == thread.id,
                Message.direction == MessageDirection.IN,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        in_reply_to = latest_inbound.rfc_message_id if latest_inbound else None
        to_emails = [latest_inbound.from_email] if latest_inbound and latest_inbound.from_email else []

        subject = thread.subject or ""
        if subject and not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        message = Message(
            user_id=deps.user.id,
            email_thread_id=thread.id,
            direction=MessageDirection.OUT,
            state=MessageState.QUEUED,
            subject=subject,
            to_emails=to_emails,
            from_email=_from_email(),
            from_name=_from_name(),
            body_text=data.body_text,
            body_html=data.body_html or data.body_text,
            in_reply_to=in_reply_to,
        )
        transaction.add(message)
        await transaction.flush()

        await dispatch_task(transaction, deps.request, TaskName.SEND_EMAIL, message_id=message.id)
        return ActionExecutionResponse(message="Reply queued", created_id=message.id)


@message_actions
class MarkRead(BaseObjectAction[Message, EmptyActionData]):
    action_key = MessageActionKey.MARK_READ
    label = "Mark read"
    icon = ActionIcon.CHECK
    priority = 10

    @classmethod
    def is_available(cls, obj: Message, deps: ActionDeps) -> bool:
        return obj.read_at is None

    @classmethod
    async def execute(
        cls, obj: Message, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.read_at = _now()
        return ActionExecutionResponse(message="Marked read")


@message_actions
class MarkUnread(BaseObjectAction[Message, EmptyActionData]):
    action_key = MessageActionKey.MARK_UNREAD
    label = "Mark unread"
    icon = ActionIcon.REFRESH
    priority = 10

    @classmethod
    def is_available(cls, obj: Message, deps: ActionDeps) -> bool:
        return obj.read_at is not None

    @classmethod
    async def execute(
        cls, obj: Message, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.read_at = None
        return ActionExecutionResponse(message="Marked unread")


@message_actions
class ArchiveMessage(BaseObjectAction[Message, EmptyActionData]):
    action_key = MessageActionKey.ARCHIVE_MESSAGE
    label = "Archive"
    icon = ActionIcon.TRASH
    priority = 20

    @classmethod
    def is_available(cls, obj: Message, deps: ActionDeps) -> bool:
        return obj.archived_at is None

    @classmethod
    async def execute(
        cls, obj: Message, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.archived_at = _now()
        return ActionExecutionResponse(message="Archived")


@message_actions
class UnarchiveMessage(BaseObjectAction[Message, EmptyActionData]):
    action_key = MessageActionKey.UNARCHIVE_MESSAGE
    label = "Unarchive"
    icon = ActionIcon.REFRESH
    priority = 20

    @classmethod
    def is_available(cls, obj: Message, deps: ActionDeps) -> bool:
        return obj.archived_at is not None

    @classmethod
    async def execute(
        cls, obj: Message, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.archived_at = None
        return ActionExecutionResponse(message="Unarchived")


@message_actions
class ResendMessage(BaseObjectAction[Message, EmptyActionData]):
    action_key = MessageActionKey.RESEND_MESSAGE
    label = "Retry send"
    icon = ActionIcon.REFRESH
    priority = 30

    @classmethod
    def is_available(cls, obj: Message, deps: ActionDeps) -> bool:
        return obj.direction == MessageDirection.OUT and obj.state == MessageState.FAILED

    @classmethod
    async def execute(
        cls, obj: Message, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.error_message = None
        await deps.sm_service.system_transition(message_state_machine, obj, MessageState.QUEUED)
        await dispatch_task(transaction, deps.request, TaskName.SEND_EMAIL, message_id=obj.id)
        return ActionExecutionResponse(message="Resending")


@message_actions
class ForwardMessage(BaseObjectAction[Message, ForwardData]):
    action_key = MessageActionKey.FORWARD_MESSAGE
    label = "Forward"
    icon = ActionIcon.SEND
    priority = 40

    @classmethod
    async def execute(
        cls, obj: Message, data: ForwardData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        thread = EmailThread(
            user_id=deps.user.id,
            subject=f"Fwd: {obj.subject}" if obj.subject else "Fwd:",
        )
        transaction.add(thread)
        await transaction.flush()

        message = Message(
            user_id=deps.user.id,
            email_thread_id=thread.id,
            direction=MessageDirection.OUT,
            state=MessageState.QUEUED,
            subject=thread.subject,
            to_emails=list(data.to),
            from_email=_from_email(),
            from_name=_from_name(),
            body_text=data.body_text,
            body_html=data.body_html or data.body_text,
        )
        transaction.add(message)
        await transaction.flush()

        await dispatch_task(transaction, deps.request, TaskName.SEND_EMAIL, message_id=message.id)
        return ActionExecutionResponse(message="Forwarded", created_id=thread.id)
