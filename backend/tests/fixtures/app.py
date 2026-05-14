"""Litestar application and test client fixtures."""

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest
from litestar import Litestar, Request
from litestar.connection import ASGIConnection
from litestar.di import Provide
from litestar.middleware.session.server_side import ServerSideSessionConfig
from litestar.stores.memory import MemoryStore
from litestar.testing import AsyncTestClient
from litestar_saq import TaskQueues
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import TestConfig
from app.domain.users.models import User
from app.domain.users.queries import get_user_by_id
from app.factory import create_app
from app.platform.clients.s3 import LocalS3Client
from app.platform.comms.clients.email import LocalEmailClient
from app.platform.llm.client import LocalLLMClient
from app.utils.sqids import SqidSchemaPlugin


@pytest.fixture
def test_app(test_config: TestConfig, db_session: AsyncSession) -> Litestar:
    """Litestar app configured for testing.

    Overrides:
    - db_session / transaction: shared test session with savepoint isolation
    - retrieve_user_handler: uses shared session (test fixtures are uncommitted)
    - task_queues: mock (no Redis workers)
    - sessions store: MemoryStore (no Redis)
    - plugins: SqidSchemaPlugin only (no SQLAlchemy plugin, no SAQ plugin)
    """

    def provide_shared_db_session() -> AsyncSession:
        return db_session

    async def provide_test_transaction(db_session: AsyncSession, request: Request) -> AsyncGenerator[AsyncSession]:
        user_id = request.session.get("user_id") if request.scope.get("session") else None
        if user_id:
            user = await get_user_by_id(db_session, int(user_id))
            await db_session.execute(text(f"SET LOCAL app.user_id = {int(user_id)}"))
            if user is not None:
                await db_session.execute(text(f"SET LOCAL app.organization_id = {int(user.organization_id)}"))
            await db_session.execute(text("SET LOCAL app.is_system_mode = false"))
        yield db_session
        if user_id:
            await db_session.execute(text("SET LOCAL app.is_system_mode = true"))

    def provide_test_task_queues() -> Any:
        mock_queue = Mock()
        mock_queue.enqueue = AsyncMock(return_value=None)
        return TaskQueues({"default": mock_queue})

    async def retrieve_user_handler_test(session: dict, _conn: ASGIConnection) -> User | None:
        user_id = session.get("user_id")
        if not user_id:
            return None
        return await get_user_by_id(db_session, user_id)

    return create_app(
        config=test_config,
        retrieve_user_handler_override=retrieve_user_handler_test,
        dependencies_overrides={
            "db_session": Provide(provide_shared_db_session, sync_to_thread=False),
            "transaction": Provide(provide_test_transaction),
            "task_queues": Provide(provide_test_task_queues, sync_to_thread=False),
        },
        plugins_overrides=[SqidSchemaPlugin()],
        stores_overrides={"sessions": MemoryStore()},
    )


@pytest.fixture
async def test_client(test_app: Litestar) -> AsyncGenerator[AsyncTestClient[Litestar]]:
    session_config = ServerSideSessionConfig(store="sessions", samesite="lax", secure=False, httponly=True)
    async with AsyncTestClient(app=test_app, session_config=session_config, raise_server_exceptions=True) as client:
        yield client
        try:
            await client.set_session_data({})
        except Exception:
            pass


@pytest.fixture
async def authenticated_client(
    test_client: AsyncTestClient[Litestar],
    user,
) -> AsyncGenerator[AsyncTestClient[Litestar]]:
    await test_client.set_session_data({"user_id": int(user.id)})
    yield test_client


@pytest.fixture
def mock_queue() -> Mock:
    """Standalone mock queue for non-HTTP task-enqueue tests."""
    queue = Mock()
    queue.enqueue = AsyncMock(return_value=None)
    return queue


def make_ctx(
    db_session: AsyncSession,
    *,
    s3_client: Any = None,
    llm_client: Any = None,
    email_client: Any = None,
    queue: Any = None,
) -> dict[str, Any]:
    """Build a SAQ-style task context for direct task invocation.

    Tasks decorated with @with_transaction read `db_sessionmaker`; tasks that
    enqueue downstream work read `queue`. Real clients are used by default so
    side-effects stay local and observable.
    """
    return {
        "db_sessionmaker": async_sessionmaker(db_session.bind, expire_on_commit=False),
        "s3_client": s3_client or LocalS3Client(),
        "llm_client": llm_client or LocalLLMClient(),
        "email_client": email_client or LocalEmailClient(),
        "queue": queue or Mock(enqueue=AsyncMock()),
    }
