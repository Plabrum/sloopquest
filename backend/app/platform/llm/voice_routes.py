"""Realtime voice WebSocket route.

Client opens `/llm/voice` and sends raw PCM16 frames as binary messages.
The actual bridging to OpenAI Realtime lives on
`OpenAIRealtimeLLMClient.voice_stream`.
"""

import logging

from litestar import Router, WebSocket, websocket
from litestar.exceptions import NotAuthorizedException
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.auth.guards import requires_session
from app.platform.llm.client import BaseLLMClient
from app.platform.llm.queries import create_thread
from app.platform.llm.service import _build_system_prompt
from app.utils.deps import rls_transaction

logger = logging.getLogger(__name__)


@websocket("/voice", guards=[requires_session])
async def voice_handler(
    socket: WebSocket,
    db_session: AsyncSession,
    voice_llm_client: BaseLLMClient,
) -> None:
    user = socket.user
    if user is None:
        raise NotAuthorizedException("Authentication required")

    user_id = int(user.id)
    organization_id = int(user.organization_id)

    async with rls_transaction(db_session, user_id=user_id, organization_id=organization_id) as txn:
        thread = await create_thread(txn, user_id=user_id, model=voice_llm_client.model)
    thread_id = int(thread.id)

    await socket.accept()
    logger.info("Voice WS connected: user=%s thread=%s", user.id, thread_id)
    try:
        await voice_llm_client.voice_stream(
            socket,
            db_session=db_session,
            user=user,
            thread_id=thread_id,
            system_prompt=_build_system_prompt(),
        )
    except Exception:
        logger.exception("Voice WS failed: user=%s thread=%s", user.id, thread_id)
    finally:
        logger.info("Voice WS disconnected: user=%s thread=%s", user.id, thread_id)
        try:
            await socket.close()
        except Exception:
            pass


voice_router = Router(path="/llm", route_handlers=[voice_handler], tags=["llm"])
