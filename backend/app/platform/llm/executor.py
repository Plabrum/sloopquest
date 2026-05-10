"""Build a per-request tool executor closure for the LLM agent loop."""

import logging

import msgspec
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.llm.client import ToolExecutorFn
from app.platform.llm.registry import ToolContext, get_tool_class, serialize_tool_result
from app.utils.sqids import sqid_dec_hook

logger = logging.getLogger(__name__)


def build_tool_executor(
    db: AsyncSession,
    user: User,
    invalidate_keys: list[str],
) -> ToolExecutorFn:
    async def execute(name: str, inputs: dict) -> str:
        tool_cls = get_tool_class(name)
        if tool_cls is None:
            return f"Unknown tool: {name}"
        if tool_cls.allowed_roles and user.role not in tool_cls.allowed_roles:
            logger.warning("Role %r denied tool %r", user.role, name)
            return "That tool is not available for your role."
        try:
            args = msgspec.convert(inputs, tool_cls.input_struct, dec_hook=sqid_dec_hook)
        except msgspec.ValidationError:
            logger.warning("Tool input invalid for %r: %r", name, inputs)
            return "Tool input invalid."
        ctx = ToolContext(db=db, user=user, invalidate_keys=invalidate_keys)
        result = await tool_cls().execute(ctx, args)
        return serialize_tool_result(result)

    return execute
