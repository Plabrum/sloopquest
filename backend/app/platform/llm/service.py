"""LLM service — orchestrates thread/message persistence and LLM calls."""

import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from litestar.exceptions import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.llm.base import registry
from app.platform.llm.client import BaseLLMClient
from app.platform.llm.enums import MessageRole
from app.platform.llm.executor import build_tool_executor
from app.platform.llm.models import LLMMessage, LLMThread
from app.platform.llm.queries import create_message, create_thread, get_messages_by_thread, get_thread_by_id
from app.platform.llm.registry import get_tool_definitions
from app.utils.sqids import Sqid

logger = logging.getLogger(__name__)


def _msg_to_dict(msg: LLMMessage) -> dict:
    return {
        "id": str(msg.id),
        "thread_id": str(Sqid(msg.thread_id)),
        "role": msg.role,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


def _build_system_prompt(context: dict | None = None) -> str:
    today = datetime.now(tz=UTC).strftime("%Y-%m-%d")
    parts = [f"Today's date is {today} (UTC)."]
    if context:
        page = context.get("current_page")
        if page:
            parts.append(f"The user is currently viewing: {page}")
    return " ".join(parts)


class LLMService:
    def __init__(self, transaction: AsyncSession, llm_client: BaseLLMClient) -> None:
        self.transaction = transaction
        self.llm_client = llm_client

    def _build_llm_messages(self, history: list[LLMMessage]) -> list[dict]:
        llm_messages: list[dict] = []
        for msg in history:
            if msg.role == MessageRole.ASSISTANT_TOOL:
                llm_messages.append({"role": "assistant", "content": json.loads(msg.content)})
            elif msg.role == MessageRole.TOOL_RESULT:
                llm_messages.append({"role": "user", "content": json.loads(msg.content)})
            else:
                llm_messages.append({"role": msg.role, "content": msg.content})
        return llm_messages

    async def create_thread_with_message(
        self,
        content: str,
        *,
        user_id: int | None = None,
        threadable_type: str | None = None,
        threadable_id: int | None = None,
        system: str | None = None,
    ) -> tuple[LLMThread, LLMMessage, LLMMessage]:
        thread = await create_thread(
            self.transaction,
            user_id=user_id,
            threadable_type=threadable_type,
            threadable_id=threadable_id,
        )
        user_msg = await create_message(self.transaction, thread_id=thread.id, role=MessageRole.USER, content=content)

        async def persist_tool_message(role: MessageRole, json_content: str) -> None:
            await create_message(self.transaction, thread_id=thread.id, role=role, content=json_content)

        tools = registry.definitions or None
        response_text = await self.llm_client.chat(
            [{"role": "user", "content": content}],
            system=system,
            tools=tools,
            tool_executor=registry.execute,
            persist_tool_message=persist_tool_message,
        )

        assistant_msg = await create_message(
            self.transaction, thread_id=thread.id, role=MessageRole.ASSISTANT, content=response_text
        )
        return thread, user_msg, assistant_msg

    async def send_message(
        self,
        thread_id: int,
        content: str,
        *,
        system: str | None = None,
    ) -> LLMMessage:
        thread = await get_thread_by_id(self.transaction, thread_id)
        if thread is None:
            raise NotFoundException("Thread not found")

        await create_message(self.transaction, thread_id=thread.id, role=MessageRole.USER, content=content)

        history = await get_messages_by_thread(self.transaction, thread_id)
        llm_messages = self._build_llm_messages(history)

        async def persist_tool_message(role: MessageRole, json_content: str) -> None:
            await create_message(self.transaction, thread_id=thread_id, role=role, content=json_content)

        tools = registry.definitions or None
        response_text = await self.llm_client.chat(
            llm_messages,
            system=system,
            tools=tools,
            tool_executor=registry.execute,
            persist_tool_message=persist_tool_message,
        )

        assistant_msg = await create_message(
            self.transaction, thread_id=thread_id, role=MessageRole.ASSISTANT, content=response_text
        )
        return assistant_msg

    async def stream_create_thread(
        self,
        content: str,
        user: User,
        *,
        context: dict | None = None,
        threadable_type: str | None = None,
        threadable_id: int | None = None,
    ) -> AsyncGenerator[tuple[str, dict]]:
        invalidate_keys: list[str] = []
        thread = await create_thread(
            self.transaction,
            user_id=int(user.id),
            threadable_type=threadable_type,
            threadable_id=threadable_id,
        )
        await create_message(self.transaction, thread_id=thread.id, role=MessageRole.USER, content=content)

        executor = build_tool_executor(self.transaction, user, invalidate_keys)
        system = _build_system_prompt(context)
        tools = get_tool_definitions() or None
        full_text = ""

        async def persist_tool_message(role: MessageRole, json_content: str) -> None:
            await create_message(self.transaction, thread_id=thread.id, role=role, content=json_content)

        async for event_name, event_data in self.llm_client.stream(
            [{"role": "user", "content": content}],
            system=system,
            tools=tools,
            tool_executor=executor,
            persist_tool_message=persist_tool_message,
        ):
            yield (event_name, event_data)
            if event_name == "token":
                full_text += event_data.get("delta", "")

        assistant_msg = await create_message(
            self.transaction, thread_id=thread.id, role=MessageRole.ASSISTANT, content=full_text
        )
        yield (
            "message_complete",
            {
                "thread_id": str(thread.id),
                "message": _msg_to_dict(assistant_msg),
                "invalidate_queries": invalidate_keys,
            },
        )

    async def stream_send_message(
        self,
        thread_id: int,
        content: str,
        user: User,
        *,
        context: dict | None = None,
    ) -> AsyncGenerator[tuple[str, dict]]:
        thread = await get_thread_by_id(self.transaction, thread_id)
        if thread is None:
            raise NotFoundException("Thread not found")

        await create_message(self.transaction, thread_id=thread.id, role=MessageRole.USER, content=content)

        history = await get_messages_by_thread(self.transaction, thread_id)
        llm_messages = self._build_llm_messages(history)

        invalidate_keys: list[str] = []
        executor = build_tool_executor(self.transaction, user, invalidate_keys)
        system = _build_system_prompt(context)
        tools = get_tool_definitions() or None
        full_text = ""

        async def persist_tool_message(role: MessageRole, json_content: str) -> None:
            await create_message(self.transaction, thread_id=thread_id, role=role, content=json_content)

        async for event_name, event_data in self.llm_client.stream(
            llm_messages,
            system=system,
            tools=tools,
            tool_executor=executor,
            persist_tool_message=persist_tool_message,
        ):
            yield (event_name, event_data)
            if event_name == "token":
                full_text += event_data.get("delta", "")

        assistant_msg = await create_message(
            self.transaction, thread_id=thread_id, role=MessageRole.ASSISTANT, content=full_text
        )
        yield (
            "message_complete",
            {
                "thread_id": str(thread.id),
                "message": _msg_to_dict(assistant_msg),
                "invalidate_queries": invalidate_keys,
            },
        )
