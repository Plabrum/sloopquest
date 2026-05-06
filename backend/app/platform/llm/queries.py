from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.llm.enums import MessageRole
from app.platform.llm.models import LLMMessage, LLMThread


async def get_thread_by_id(db: AsyncSession, thread_id: int) -> LLMThread | None:
    result = await db.execute(select(LLMThread).where(LLMThread.id == thread_id))
    return result.scalar_one_or_none()


async def get_messages_by_thread(db: AsyncSession, thread_id: int) -> list[LLMMessage]:
    """Load the full message history for a thread (used server-side for LLM context)."""
    result = await db.execute(select(LLMMessage).where(LLMMessage.thread_id == thread_id).order_by(LLMMessage.id.asc()))
    return list(result.scalars().all())


_INTERNAL_ROLES = (MessageRole.ASSISTANT_TOOL, MessageRole.TOOL_RESULT)


async def get_messages_after(
    db: AsyncSession,
    thread_id: int,
    after_id: int | None = None,
    limit: int = 50,
) -> tuple[list[LLMMessage], bool]:
    """Cursor-based message fetch (excludes internal tool-use/tool-result rows)."""
    base = select(LLMMessage).where(
        LLMMessage.thread_id == thread_id,
        LLMMessage.role.not_in(_INTERNAL_ROLES),
    )
    if after_id is not None:
        q = base.where(LLMMessage.id > after_id).order_by(LLMMessage.id.asc()).limit(limit + 1)
    else:
        q = base.order_by(LLMMessage.id.desc()).limit(limit + 1)

    result = await db.execute(q)
    rows = list(result.scalars().all())

    if after_id is not None:
        has_more = len(rows) > limit
        messages = rows[:limit]
    else:
        has_more = len(rows) > limit
        messages = list(reversed(rows[:limit]))

    return messages, has_more


async def create_thread(
    db: AsyncSession,
    user_id: int | None = None,
    threadable_type: str | None = None,
    threadable_id: int | None = None,
) -> LLMThread:
    thread = LLMThread(
        user_id=user_id,
        threadable_type=threadable_type,
        threadable_id=threadable_id,
    )
    db.add(thread)
    await db.flush()
    return thread


async def create_message(db: AsyncSession, thread_id: int, role: MessageRole, content: str) -> LLMMessage:
    message = LLMMessage(thread_id=thread_id, role=role, content=content)
    db.add(message)
    await db.flush()
    return message
