"""LLM chat routes — SSE streaming + thread/message CRUD."""

from collections.abc import AsyncGenerator

from litestar import Router, delete, get, post
from litestar.response import Stream
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.llm.client import BaseLLMClient
from app.platform.llm.queries import delete_thread, get_messages_after, list_threads_by_user
from app.platform.llm.schemas import (
    CreateThreadBody,
    MessagePageSchema,
    MessageSchema,
    SendMessageBody,
    ThreadListPage,
    ThreadSummarySchema,
)
from app.platform.llm.service import LLMService
from app.platform.streaming.sse import format_frame, stream_response
from app.utils.sqids import Sqid, sqid_decode


@get("/threads", guards=[requires_session])
async def list_threads_handler(
    transaction: AsyncSession,
    user: User,
) -> ThreadListPage:
    rows = await list_threads_by_user(transaction, int(user.id))
    summaries = [
        ThreadSummarySchema(
            id=thread.id,
            title=(first_content[:80] if first_content else None),
            last_message_at=last_at,
        )
        for thread, first_content, last_at in rows
    ]
    return ThreadListPage(threads=summaries)


@get("/threads/{thread_id:str}/messages", guards=[requires_session])
async def get_thread_messages_handler(
    thread_id: Sqid,
    transaction: AsyncSession,
    after: str | None = None,
    limit: int = 50,
) -> MessagePageSchema:
    after_id = sqid_decode(after) if after else None
    messages, has_more = await get_messages_after(transaction, int(thread_id), after_id=after_id, limit=limit)
    return MessagePageSchema(
        messages=[
            MessageSchema(
                id=msg.id,
                thread_id=Sqid(msg.thread_id),
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        has_more=has_more,
        next_cursor=Sqid(messages[-1].id) if has_more and messages else None,
    )


@delete("/threads/{thread_id:str}", guards=[requires_session], status_code=204)
async def delete_thread_handler(
    thread_id: Sqid,
    transaction: AsyncSession,
) -> None:
    await delete_thread(transaction, int(thread_id))


@post("/threads/stream", guards=[requires_session])
async def stream_create_thread_handler(
    data: CreateThreadBody,
    transaction: AsyncSession,
    llm_client: BaseLLMClient,
    user: User,
) -> Stream:
    service = LLMService(transaction, llm_client)

    async def gen() -> AsyncGenerator[bytes]:
        async for event_name, event_data in service.stream_create_thread(
            data.content,
            user=user,
            context=data.context,
        ):
            yield format_frame(event_name, event_data)

    return stream_response(gen())


@post("/threads/{thread_id:str}/messages/stream", guards=[requires_session])
async def stream_send_message_handler(
    thread_id: Sqid,
    data: SendMessageBody,
    transaction: AsyncSession,
    llm_client: BaseLLMClient,
    user: User,
) -> Stream:
    service = LLMService(transaction, llm_client)

    async def gen() -> AsyncGenerator[bytes]:
        async for event_name, event_data in service.stream_send_message(
            int(thread_id),
            data.content,
            user=user,
            context=data.context,
        ):
            yield format_frame(event_name, event_data)

    return stream_response(gen())


llm_router = Router(
    path="/llm",
    route_handlers=[
        list_threads_handler,
        get_thread_messages_handler,
        delete_thread_handler,
        stream_create_thread_handler,
        stream_send_message_handler,
    ],
    tags=["llm"],
)
