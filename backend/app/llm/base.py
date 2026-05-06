"""Tool registry for the LLM agentic loop.

Domain tools subclass Tool and self-register on class definition.
Importing a module containing Tool subclasses is sufficient to register them.
"""

import logging

from app.llm.schemas import InputSchema, ToolDefinition

logger = logging.getLogger(__name__)


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: "Tool") -> None:
        if tool.name in self._tools:
            logger.warning("Tool %r already registered — overwriting", tool.name)
        self._tools[tool.name] = tool

    @property
    def definitions(self) -> list[ToolDefinition]:
        return [t.definition for t in self._tools.values()]

    async def execute(self, name: str, inputs: dict) -> str:
        tool = self._tools.get(name)
        if tool is None:
            return f"Unknown tool: {name}"
        return await tool.execute(inputs)

    def __len__(self) -> int:
        return len(self._tools)


registry = ToolRegistry()


class Tool:
    name: str
    description: str
    input_schema: InputSchema

    def __init_subclass__(cls, **kwargs: object) -> None:
        super().__init_subclass__(**kwargs)
        registry.register(cls())

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(name=self.name, description=self.description, input_schema=self.input_schema)

    async def execute(self, inputs: dict) -> str:
        raise NotImplementedError(f"Tool {self.name!r} has no execute implementation")
