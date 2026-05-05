"""Unit tests for the LLM client abstraction and agentic loop."""
# pyright: reportAttributeAccessIssue=false

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.llm.client import AnthropicLLMClient, LocalLLMClient
from app.llm.enums import MessageRole
from app.llm.tools import ECHO_TOOL, echo_executor


async def test_local_client_returns_stub_without_calling_api() -> None:
    client = LocalLLMClient()
    out = await client.chat([{"role": "user", "content": "hi"}])
    assert out == "[dev mode: LLM disabled]"


async def test_anthropic_agentic_loop_executes_tool_and_returns_text() -> None:
    """Two-iteration loop: first response asks for `echo`, second returns final text.

    Verifies the loop:
      - dispatches `tool_use` blocks through the executor
      - appends the assistant tool_use turn to history
      - appends a `tool_result` user turn with the executor's output
      - persists both turns via `persist_tool_message`
      - returns the final assistant text on `end_turn`
    """
    client = AnthropicLLMClient(api_key="test-key")

    tool_use_block = SimpleNamespace(
        type="tool_use",
        id="toolu_1",
        name="echo",
        input={"message": "ahoy"},
        model_dump=lambda: {"type": "tool_use", "id": "toolu_1", "name": "echo", "input": {"message": "ahoy"}},
    )
    text_block = SimpleNamespace(type="text", text="echoed: ahoy")

    response_tool = SimpleNamespace(stop_reason="tool_use", content=[tool_use_block])
    response_final = SimpleNamespace(stop_reason="end_turn", content=[text_block])

    mock_create = AsyncMock(side_effect=[response_tool, response_final])
    client._client = SimpleNamespace(messages=SimpleNamespace(create=mock_create))

    persisted: list[tuple[MessageRole, str]] = []

    async def persist(role: MessageRole, content: str) -> None:
        persisted.append((role, content))

    out = await client.chat(
        [{"role": "user", "content": "say ahoy"}],
        tools=[ECHO_TOOL],
        tool_executor=echo_executor,
        persist_tool_message=persist,
    )

    assert out == "echoed: ahoy"
    assert mock_create.await_count == 2

    second_call_msgs = mock_create.await_args_list[1].kwargs["messages"]
    assert second_call_msgs[0] == {"role": "user", "content": "say ahoy"}
    assert second_call_msgs[1]["role"] == "assistant"
    assert second_call_msgs[2]["role"] == "user"
    tool_result = second_call_msgs[2]["content"][0]
    assert tool_result["type"] == "tool_result"
    assert tool_result["tool_use_id"] == "toolu_1"
    assert tool_result["content"] == "ahoy"

    assert [r for r, _ in persisted] == [MessageRole.ASSISTANT_TOOL, MessageRole.TOOL_RESULT]


async def test_anthropic_returns_text_directly_on_end_turn() -> None:
    client = AnthropicLLMClient(api_key="test-key")
    text_block = SimpleNamespace(type="text", text="hello back")
    response = SimpleNamespace(stop_reason="end_turn", content=[text_block])
    client._client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=response)))

    out = await client.chat([{"role": "user", "content": "hi"}])
    assert out == "hello back"


async def test_anthropic_loop_bails_after_max_iterations() -> None:
    client = AnthropicLLMClient(api_key="test-key")
    tool_use_block = SimpleNamespace(
        type="tool_use",
        id="toolu_loop",
        name="echo",
        input={"message": "x"},
        model_dump=lambda: {"type": "tool_use", "id": "toolu_loop", "name": "echo", "input": {"message": "x"}},
    )
    response = SimpleNamespace(stop_reason="tool_use", content=[tool_use_block])
    client._client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=response)))

    out = await client.chat(
        [{"role": "user", "content": "go"}],
        tools=[ECHO_TOOL],
        tool_executor=echo_executor,
    )
    assert "wasn't able to complete" in out


@pytest.mark.parametrize("name,expected", [("echo", "ahoy"), ("unknown", "Unknown tool: unknown")])
async def test_echo_executor(name: str, expected: str) -> None:
    out = await echo_executor(name, {"message": "ahoy"})
    assert out == expected
