"""Unit tests for the LLM client abstraction and agentic loop."""
# pyright: reportAttributeAccessIssue=false

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.platform.llm.client import AnthropicLLMClient, LocalLLMClient
from app.platform.llm.enums import MessageRole
from app.platform.llm.registry import (
    SloopTool,
    ToolContext,
    ToolResult,
    get_tool_definitions,
    register_tool,
    serialize_tool_result,
)
from app.platform.llm.schemas import InputSchema, PropertySchema

# --- Test tool registered inline ---


@register_tool
class _EchoTool(SloopTool):
    name = "_test_echo"
    description = "Echo a message back (test only)."
    input_schema = InputSchema(
        properties={"message": PropertySchema(type="string", description="Message to echo.")},
        required=["message"],
    )

    class _Struct:
        def __init__(self, message: str) -> None:
            self.message = message

    input_struct = _Struct  # type: ignore[assignment]

    async def execute(self, ctx: ToolContext, args: _Struct) -> ToolResult | str:
        return str(args.message)


async def _echo_executor(name: str, inputs: dict) -> str:
    if name == "_test_echo":
        return str(inputs.get("message", ""))
    return f"Unknown tool: {name}"


async def _aiter(*items: str) -> AsyncIterator[str]:
    for item in items:
        yield item


# --- Client tests ---


async def test_local_client_returns_stub_without_calling_api() -> None:
    client = LocalLLMClient()
    out = await client.chat([{"role": "user", "content": "hi"}])
    assert out == "[dev mode: LLM disabled]"


async def test_anthropic_agentic_loop_executes_tool_and_returns_text() -> None:
    """Two-iteration loop: first response uses a tool, second returns final text."""
    client = AnthropicLLMClient(api_key="test-key")

    tool_use_block = SimpleNamespace(
        type="tool_use",
        id="toolu_1",
        name="_test_echo",
        input={"message": "ahoy"},
        model_dump=lambda: {"type": "tool_use", "id": "toolu_1", "name": "_test_echo", "input": {"message": "ahoy"}},
    )

    response_tool = SimpleNamespace(stop_reason="tool_use", content=[tool_use_block], usage=None)
    response_final = SimpleNamespace(stop_reason="end_turn", content=[], usage=None)

    stream_calls: list[dict] = []

    @asynccontextmanager
    async def fake_stream(**kwargs):
        stream_calls.append(kwargs)
        if len(stream_calls) == 1:
            ctx = MagicMock()
            ctx.text_stream = _aiter()
            ctx.get_final_message = AsyncMock(return_value=response_tool)
            yield ctx
        else:
            ctx = MagicMock()
            ctx.text_stream = _aiter("echoed: ahoy")
            ctx.get_final_message = AsyncMock(return_value=response_final)
            yield ctx

    client._client = SimpleNamespace(messages=SimpleNamespace(stream=fake_stream))

    persisted: list[tuple[MessageRole, str]] = []

    async def persist(role: MessageRole, content: str) -> None:
        persisted.append((role, content))

    tool_defs = get_tool_definitions()
    out = await client.chat(
        [{"role": "user", "content": "say ahoy"}],
        tools=tool_defs,
        tool_executor=_echo_executor,
        persist_tool_message=persist,
    )

    assert out == "echoed: ahoy"
    assert len(stream_calls) == 2

    second_call_msgs = stream_calls[1]["messages"]
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
    response = SimpleNamespace(stop_reason="end_turn", content=[], usage=None)

    @asynccontextmanager
    async def fake_stream(**kwargs):
        ctx = MagicMock()
        ctx.text_stream = _aiter("hello back")
        ctx.get_final_message = AsyncMock(return_value=response)
        yield ctx

    client._client = SimpleNamespace(messages=SimpleNamespace(stream=fake_stream))
    out = await client.chat([{"role": "user", "content": "hi"}])
    assert out == "hello back"


async def test_anthropic_loop_bails_after_max_iterations() -> None:
    client = AnthropicLLMClient(api_key="test-key")
    tool_use_block = SimpleNamespace(
        type="tool_use",
        id="toolu_loop",
        name="_test_echo",
        input={"message": "x"},
        model_dump=lambda: {"type": "tool_use", "id": "toolu_loop", "name": "_test_echo", "input": {"message": "x"}},
    )
    response = SimpleNamespace(stop_reason="tool_use", content=[tool_use_block], usage=None)

    @asynccontextmanager
    async def fake_stream(**kwargs):
        ctx = MagicMock()
        ctx.text_stream = _aiter()
        ctx.get_final_message = AsyncMock(return_value=response)
        yield ctx

    client._client = SimpleNamespace(messages=SimpleNamespace(stream=fake_stream))

    tool_defs = get_tool_definitions()
    out = await client.chat(
        [{"role": "user", "content": "go"}],
        tools=tool_defs,
        tool_executor=_echo_executor,
    )
    assert "could not be completed" in out


@pytest.mark.parametrize("name,expected", [("_test_echo", "ahoy"), ("unknown", "Unknown tool: unknown")])
async def test_echo_executor(name: str, expected: str) -> None:
    out = await _echo_executor(name, {"message": "ahoy"})
    assert out == expected


async def test_serialize_tool_result_str() -> None:
    assert serialize_tool_result("plain string") == "plain string"


async def test_serialize_tool_result_with_data() -> None:
    result = ToolResult(data={"count": 3}, message="Found 3")
    serialized = serialize_tool_result(result)
    parsed = json.loads(serialized)
    assert parsed["data"] == {"count": 3}
    assert parsed["message"] == "Found 3"


async def test_get_tool_definitions_returns_registered_tools() -> None:
    defs = get_tool_definitions()
    names = [d.name for d in defs]
    assert "_test_echo" in names
