"""LLM client abstractions and the agentic tool-use loop."""

import json
import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator, Awaitable, Callable

import anthropic
import msgspec

from app.config import config
from app.platform.llm.enums import MessageRole
from app.platform.llm.schemas import ToolDefinition

logger = logging.getLogger(__name__)

ToolExecutorFn = Callable[[str, dict], Awaitable[str]]
PersistToolMessageFn = Callable[[MessageRole, str], Awaitable[None]]


class BaseLLMClient(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str: ...

    @abstractmethod
    def stream(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> AsyncGenerator[tuple[str, dict]]: ...


class LocalLLMClient(BaseLLMClient):
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
    ) -> AsyncGenerator[tuple[str, dict]]:
        logger.info("[dev] LLM stream called — returning stub response")
        yield ("token", {"delta": "[dev mode: LLM disabled]"})


class AnthropicLLMClient(BaseLLMClient):
    def __init__(self, api_key: str | None = None) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or config.ANTHROPIC_API_KEY,
            timeout=anthropic.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0),
        )

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
        async for event_name, event_data in self.stream(
            messages,
            system=system,
            tools=tools,
            tool_executor=tool_executor,
            persist_tool_message=persist_tool_message,
        ):
            if event_name == "token":
                text_parts.append(event_data["delta"])
            elif event_name == "error":
                return event_data.get("message", "I wasn't able to complete that request.")
        return "".join(text_parts)

    async def stream(  # type: ignore[override]
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> AsyncGenerator[tuple[str, dict]]:
        msgs = list(messages)
        max_iterations = 10

        for _ in range(max_iterations):
            kwargs: dict = {
                "model": "claude-sonnet-4-6",
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
                        yield ("token", {"delta": text})
                    final = await stream_ctx.get_final_message()
            except anthropic.APIError as exc:
                logger.exception("Anthropic API error during stream")
                yield ("error", {"message": str(exc)})
                return

            if final.stop_reason == "tool_use" and tool_executor is not None:
                assistant_content = [block.model_dump() for block in final.content]
                msgs.append({"role": "assistant", "content": final.content})

                if persist_tool_message is not None:
                    await persist_tool_message(MessageRole.ASSISTANT_TOOL, json.dumps(assistant_content))

                tool_results = []
                for block in final.content:
                    if block.type == "tool_use":
                        yield ("tool_call", {"name": block.name, "id": block.id})
                        result = await tool_executor(block.name, block.input)
                        yield ("tool_result", {"tool_use_id": block.id, "content": result})
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
        yield ("error", {"message": "Request could not be completed."})
