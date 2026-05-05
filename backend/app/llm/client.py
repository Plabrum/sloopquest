"""LLM client abstractions and the agentic tool-use loop."""

import json
import logging
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable

import anthropic
import msgspec

from app.config import config
from app.llm.enums import MessageRole
from app.llm.schemas import ToolDefinition

logger = logging.getLogger(__name__)

ToolExecutorFn = Callable[[str, dict], Awaitable[str]]
PersistToolMessageFn = Callable[[MessageRole, str], Awaitable[None]]


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str:
        """Send messages and return the assistant's final text response."""


class LocalLLMClient(BaseLLMClient):
    """Dev stub — logs the call and returns a placeholder response."""

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


class AnthropicLLMClient(BaseLLMClient):
    def __init__(self, api_key: str | None = None) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key or config.ANTHROPIC_API_KEY)

    async def chat(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[ToolDefinition] | None = None,
        tool_executor: ToolExecutorFn | None = None,
        persist_tool_message: PersistToolMessageFn | None = None,
    ) -> str:
        """Call Claude with an agentic tool-use loop; return final assistant text."""
        msgs = list(messages)
        max_iterations = 10

        for _ in range(max_iterations):
            kwargs: dict = {
                "model": "claude-sonnet-4-6",
                "max_tokens": 1024,
                "messages": msgs,
            }
            if system:
                kwargs["system"] = system
            if tools:
                kwargs["tools"] = msgspec.to_builtins(tools)

            response = await self._client.messages.create(**kwargs)

            if response.stop_reason == "tool_use" and tool_executor is not None:
                assistant_content = [block.model_dump() for block in response.content]
                msgs.append({"role": "assistant", "content": response.content})

                if persist_tool_message is not None:
                    await persist_tool_message(MessageRole.ASSISTANT_TOOL, json.dumps(assistant_content))

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = await tool_executor(block.name, block.input)
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

            for block in response.content:
                if block.type == "text":
                    return block.text

            return ""

        logger.warning("LLM agentic loop hit max_iterations=%d", max_iterations)
        return "I wasn't able to complete that request."
