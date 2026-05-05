"""Tool registration for the LLM agentic loop.

Domain-specific tools are added by feature tickets. This module ships with one
trivial example (`echo`) so the agentic loop can be exercised end-to-end.
"""

from collections.abc import Awaitable, Callable

from app.llm.schemas import InputSchema, PropertySchema, ToolDefinition

ToolExecutorFn = Callable[[str, dict], Awaitable[str]]


# --- Example tool (kept as the pattern for adding sloopquest tools later) ---

ECHO_TOOL = ToolDefinition(
    name="echo",
    description="Echo a message back. Useful as a smoke test for the tool-use loop.",
    input_schema=InputSchema(
        properties={
            "message": PropertySchema(type="string", description="The message to echo back."),
        },
        required=["message"],
    ),
)


async def echo_executor(name: str, inputs: dict) -> str:
    if name != "echo":
        return f"Unknown tool: {name}"
    return str(inputs.get("message", ""))
