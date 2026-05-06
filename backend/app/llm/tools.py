"""LLM tools for the sloopquest core module.

Domain-specific tools live in their own domain's tools.py files.
This module holds only cross-cutting or smoke-test tools.
"""

from app.llm.base import Tool
from app.llm.schemas import InputSchema, PropertySchema


class EchoTool(Tool):
    name = "echo"
    description = "Echo a message back. Useful as a smoke test for the tool-use loop."
    input_schema = InputSchema(
        properties={"message": PropertySchema(type="string", description="The message to echo back.")},
        required=["message"],
    )

    async def execute(self, inputs: dict) -> str:
        return str(inputs.get("message", ""))
