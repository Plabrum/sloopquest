"""LLM client abstractions and the agentic tool-use loop."""

import asyncio
import base64
import json
import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

import anthropic
import msgspec
from litestar import WebSocket
from litestar.exceptions import WebSocketDisconnect
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.users.models import User
from app.platform.llm.enums import MessageRole
from app.platform.llm.executor import PersistToolMessageFn, ToolExecutorFn, build_tool_executor
from app.platform.llm.queries import create_message, create_tool_call
from app.platform.llm.registry import get_tool_definitions
from app.platform.llm.schemas import (
    ErrorEvent,
    SseEvent,
    TokenEvent,
    ToolCallEvent,
    ToolDefinition,
    ToolResultEvent,
)
from app.utils.deps import rls_transaction

logger = logging.getLogger(__name__)


class BaseLLMClient(ABC):
    """Provider-agnostic LLM client interface.

    Each modality (text chat / streaming / realtime voice) is a separate
    optional capability. Subclasses implement what their provider supports;
    callers should not need to know which provider is in use, and provider
    selection lives entirely in `deps.py`.
    """

    @property
    @abstractmethod
    def model(self) -> str: ...

    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str:
        raise NotImplementedError(f"{type(self).__name__} does not support text chat")

    async def stream(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> AsyncGenerator[SseEvent]:
        raise NotImplementedError(f"{type(self).__name__} does not support text streaming")
        yield  # pragma: no cover

    async def voice_stream(
        self,
        socket: WebSocket,
        *,
        db_session: AsyncSession,
        user: User,
        thread_id: int,
        system_prompt: str,
    ) -> None:
        raise NotImplementedError(f"{type(self).__name__} does not support voice")


class LocalLLMClient(BaseLLMClient):
    @property
    def model(self) -> str:
        return "local-dev"

    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str:
        logger.info("[dev] LLM chat called — returning stub response")
        return "[dev mode: LLM disabled]"

    async def stream(  # type: ignore[override]
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> AsyncGenerator[SseEvent]:
        logger.info("[dev] LLM stream called — returning stub response")
        yield TokenEvent(delta="[dev mode: LLM disabled]")


class AnthropicLLMClient(BaseLLMClient):
    MODEL = "claude-sonnet-4-6"

    def __init__(self, api_key: str | None = None) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or config.ANTHROPIC_API_KEY,
            timeout=anthropic.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0),
        )

    @property
    def model(self) -> str:
        return self.MODEL

    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str:
        text_parts: list[str] = []
        async for ev in self.stream(
            messages,
            system=system,
            tools=tools,
            tool_executor=tool_executor,
            persist_tool_message=persist_tool_message,
        ):
            if isinstance(ev, TokenEvent):
                text_parts.append(ev.delta)
            elif isinstance(ev, ErrorEvent):
                return ev.message
        return "".join(text_parts)

    async def stream(  # type: ignore[override]
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> AsyncGenerator[SseEvent]:
        msgs = list(messages)
        max_iterations = 10

        for _ in range(max_iterations):
            kwargs: dict = {
                "model": self.MODEL,
                "max_tokens": 8096,
                "messages": msgs,
            }
            if system:
                # Tag system block for prompt caching
                kwargs["system"] = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
            if tools:
                tool_defs = msgspec.to_builtins(tools)
                # Tag last tool definition for prompt caching
                if tool_defs:
                    tool_defs[-1] = {**tool_defs[-1], "cache_control": {"type": "ephemeral"}}
                kwargs["tools"] = tool_defs

            try:
                async with self._client.messages.stream(**kwargs) as stream_ctx:
                    async for text in stream_ctx.text_stream:
                        yield TokenEvent(delta=text)
                    final = await stream_ctx.get_final_message()
            except anthropic.APIError as exc:
                logger.exception("Anthropic API error during stream")
                yield ErrorEvent(message=str(exc))
                return

            if final.stop_reason == "tool_use" and tool_executor is not None:
                assistant_content = [block.model_dump() for block in final.content]
                msgs.append({"role": "assistant", "content": final.content})

                if persist_tool_message is not None:
                    await persist_tool_message(MessageRole.ASSISTANT_TOOL, json.dumps(assistant_content))

                tool_results = []
                for block in final.content:
                    if block.type == "tool_use":
                        yield ToolCallEvent(id=block.id, name=block.name, input=block.input)
                        result, is_error = await tool_executor(block.name, block.input)
                        yield ToolResultEvent(tool_use_id=block.id, is_error=is_error)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            }
                        )

                msgs.append({"role": "user", "content": tool_results})

                if persist_tool_message is not None:
                    await persist_tool_message(MessageRole.TOOL_RESULT, json.dumps(tool_results))

                continue

            return

        logger.warning("LLM streaming loop hit max_iterations=%d", max_iterations)
        yield ErrorEvent(message="Request could not be completed.")


def _to_openai_tools(defs: list[ToolDefinition]) -> list[dict]:
    """Anthropic-shaped ToolDefinition → OpenAI Realtime function tool shape."""
    return [
        {
            "type": "function",
            "name": d.name,
            "description": d.description,
            "parameters": msgspec.to_builtins(d.input_schema),
        }
        for d in defs
    ]


class OpenAIRealtimeLLMClient(BaseLLMClient):
    """OpenAI Realtime API client — implements the voice capability."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._api_key = api_key or config.OPENAI_API_KEY
        self._model = model or config.OPENAI_REALTIME_MODEL

    @property
    def model(self) -> str:
        return self._model

    async def voice_stream(  # type: ignore[override]
        self,
        socket: WebSocket,
        *,
        db_session: AsyncSession,
        user: User,
        thread_id: int,
        system_prompt: str,
    ) -> None:
        """Run the bidirectional audio bridge for one voice session.

        Pumps PCM16 audio frames between the client WebSocket and the
        OpenAI Realtime session, dispatching tool calls through the same
        `build_tool_executor` used by the SSE text path and persisting
        transcripts + tool calls into the existing LLM tables.
        """
        invalidate_keys: list[str] = []
        user_id = int(user.id)
        organization_id = int(user.organization_id)

        def txn() -> Any:
            return rls_transaction(db_session, user_id=user_id, organization_id=organization_id)

        openai_client = AsyncOpenAI(api_key=self._api_key)

        async with openai_client.beta.realtime.connect(model=self._model) as conn:
            session_payload: Any = {
                "modalities": ["audio", "text"],
                "instructions": system_prompt,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {"type": "server_vad"},
                "tools": _to_openai_tools(get_tool_definitions()),
                "tool_choice": "auto",
            }
            await conn.session.update(session=session_payload)

            assistant_text = ""
            pending_tool_calls: list[dict] = []

            async def pump_client_to_openai() -> None:
                try:
                    while True:
                        msg = await socket.receive()
                        if msg["type"] == "websocket.disconnect":
                            return
                        data = msg.get("bytes")
                        if data is None:
                            text = msg.get("text")
                            if text:
                                try:
                                    payload = json.loads(text)
                                except json.JSONDecodeError:
                                    continue
                                if payload.get("type") == "cancel":
                                    await conn.response.cancel()
                            continue
                        b64 = base64.b64encode(data).decode("ascii")
                        await conn.input_audio_buffer.append(audio=b64)
                except WebSocketDisconnect:
                    return

            async def persist_assistant_turn() -> None:
                nonlocal assistant_text, pending_tool_calls
                text = assistant_text
                calls = pending_tool_calls
                assistant_text = ""
                pending_tool_calls = []
                if not text and not calls:
                    return
                async with txn() as session:
                    assistant_msg = await create_message(
                        session, thread_id=thread_id, role=MessageRole.ASSISTANT, content=text
                    )
                    for tc in calls:
                        await create_tool_call(
                            session,
                            message_id=int(assistant_msg.id),
                            tool_use_id=tc["id"],
                            name=tc["name"],
                            input=tc["input"],
                            is_error=tc["is_error"],
                        )

            async def handle_tool_call(event: Any) -> None:
                try:
                    inputs = json.loads(event.arguments) if event.arguments else {}
                except json.JSONDecodeError:
                    inputs = {}
                async with txn() as session:
                    executor = build_tool_executor(session, user, invalidate_keys)
                    result, is_error = await executor(event.name, inputs)
                pending_tool_calls.append(
                    {"id": event.call_id, "name": event.name, "input": inputs, "is_error": is_error}
                )
                await conn.conversation.item.create(
                    item={
                        "type": "function_call_output",
                        "call_id": event.call_id,
                        "output": result,
                    }
                )
                await conn.response.create()
                if invalidate_keys:
                    try:
                        await socket.send_json({"type": "invalidate", "keys": list(invalidate_keys)})
                    finally:
                        invalidate_keys.clear()

            async def pump_openai_to_client() -> None:
                nonlocal assistant_text
                # OpenAI Realtime events are a tagged union; pyright can't
                # narrow on `.type` against string literals, so dispatch on
                # the type string and read attrs through Any.
                async for raw_event in conn:
                    event: Any = raw_event
                    etype: str = event.type
                    if etype == "response.audio.delta":
                        await socket.send_bytes(base64.b64decode(event.delta))
                    elif etype == "response.audio_transcript.delta":
                        assistant_text += event.delta
                    elif etype == "conversation.item.input_audio_transcription.completed":
                        if event.transcript:
                            async with txn() as session:
                                await create_message(
                                    session,
                                    thread_id=thread_id,
                                    role=MessageRole.USER,
                                    content=event.transcript,
                                )
                    elif etype == "response.function_call_arguments.done":
                        await handle_tool_call(event)
                    elif etype == "response.done":
                        await persist_assistant_turn()
                    elif etype == "error":
                        logger.warning("OpenAI realtime error: %r", getattr(event, "error", event))

            client_task = asyncio.create_task(pump_client_to_openai())
            openai_task = asyncio.create_task(pump_openai_to_client())
            done, pending = await asyncio.wait({client_task, openai_task}, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            for task in done:
                exc = task.exception()
                if exc and not isinstance(exc, WebSocketDisconnect):
                    logger.exception("Realtime bridge task failed", exc_info=exc)
