"""Thread REST routes — message create/list and batch unread counts."""

import logging
from typing import Annotated

from litestar import Request, Router, get, post
from litestar.channels import ChannelsPlugin
from litestar.params import Parameter
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.platform.auth.guards import requires_session
from app.platform.threads.enums import ThreadSocketMessageType
from app.platform.threads.models import Message, Thread
from app.platform.threads.schemas import (
    BatchUnreadRequest,
    BatchUnreadResponse,
    MessageCreateSchema,
    MessageListResponse,
    MessageSchema,
    ServerMessage,
    ThreadUnreadInfo,
)
from app.platform.threads.services import (
    get_batch_unread_counts,
    get_or_create_thread,
    mark_thread_as_read,
    notify_thread,
)
from app.utils.sqids import Sqid, sqid_encode

logger = logging.getLogger(__name__)


def _user_id(request: Request) -> int:
    """Extract integer user id from the request's auth context."""
    user = request.user
    return int(getattr(user, "id", user))


@post("/{threadable_type:str}/{threadable_id:int}/messages")
async def create_message(
    request: Request,
    threadable_type: str,
    threadable_id: int,
    data: MessageCreateSchema,
    transaction: AsyncSession,
    channels: ChannelsPlugin,
) -> MessageSchema:
    user_id = _user_id(request)

    thread = await get_or_create_thread(
        transaction=transaction,
        threadable_type=threadable_type,
        threadable_id=threadable_id,
    )

    message = Message(thread_id=thread.id, user_id=user_id, content=data.content)
    transaction.add(message)
    await transaction.flush()

    # Sender's own messages shouldn't count as unread for them.
    await mark_thread_as_read(transaction, thread.id, user_id)

    await notify_thread(
        channels,
        thread.id,
        ServerMessage(
            message_type=ThreadSocketMessageType.MESSAGE_CREATED,
            message_id=sqid_encode(message.id),
            thread_id=sqid_encode(thread.id),
            user_id=sqid_encode(user_id),
            viewers=[],
        ),
    )

    logger.info(
        "Created message %s in thread %s (%s:%s)",
        message.id,
        thread.id,
        threadable_type,
        threadable_id,
    )

    return MessageSchema(
        id=Sqid(message.id),
        thread_id=Sqid(thread.id),
        user_id=Sqid(user_id),
        content=message.content,
        created_at=message.created_at,
        updated_at=message.updated_at,
        user=None,
    )


@get("/{threadable_type:str}/{threadable_id:int}/messages")
async def list_messages(
    threadable_type: str,
    threadable_id: int,
    transaction: AsyncSession,
    offset: Annotated[int, Parameter(ge=0)] = 0,
    limit: Annotated[int, Parameter(ge=1, le=100)] = 50,
) -> MessageListResponse:
    stmt = (
        select(Message)
        .join(
            Thread,
            and_(
                Message.thread_id == Thread.id,
                Thread.threadable_type == threadable_type,
                Thread.threadable_id == threadable_id,
            ),
        )
        .where(Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .options(joinedload(Message.thread))
    )

    result = await transaction.execute(stmt)
    rows = result.scalars().all()

    messages = [
        MessageSchema(
            id=Sqid(m.id),
            thread_id=Sqid(m.thread_id),
            user_id=Sqid(m.user_id) if m.user_id is not None else None,
            content=m.content,
            created_at=m.created_at,
            updated_at=m.updated_at,
            user=None,
        )
        for m in rows
    ]

    return MessageListResponse(messages=messages, offset=offset, limit=limit)


@post("/{threadable_type:str}/{threadable_id:int}/mark-read", status_code=204)
async def mark_read(
    request: Request,
    threadable_type: str,
    threadable_id: int,
    transaction: AsyncSession,
) -> None:
    thread = await get_or_create_thread(
        transaction=transaction,
        threadable_type=threadable_type,
        threadable_id=threadable_id,
    )
    await mark_thread_as_read(transaction, thread.id, _user_id(request))


@post("/{threadable_type:str}/batch-unread")
async def get_batch_thread_unread(
    request: Request,
    threadable_type: str,
    data: BatchUnreadRequest,
    transaction: AsyncSession,
) -> BatchUnreadResponse:
    if not data.object_ids:
        return BatchUnreadResponse(threads=[], total_unread=0)

    results = await get_batch_unread_counts(
        transaction,
        threadable_type,
        [int(oid) for oid in data.object_ids],
        _user_id(request),
    )

    thread_infos: list[ThreadUnreadInfo] = []
    total_unread = 0
    for thread_id, unread_count in results:
        thread_infos.append(ThreadUnreadInfo(thread_id=Sqid(thread_id), unread_count=unread_count))
        total_unread += unread_count

    return BatchUnreadResponse(threads=thread_infos, total_unread=total_unread)


thread_router = Router(
    path="/threads",
    guards=[requires_session],
    route_handlers=[
        create_message,
        list_messages,
        mark_read,
        get_batch_thread_unread,
    ],
    tags=["threads"],
)
