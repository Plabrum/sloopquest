"""Smoke tests for the test infrastructure itself.

Exercises:
- Factory persistence via db_session
- Savepoint isolation between tests
- Mock task_queues capturing enqueue calls
- Direct task invocation via make_ctx()
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.queue.registry import task
from tests.factories.users import UserFactory
from tests.fixtures.app import make_ctx


async def test_factory_creates_persisted_user(db_session: AsyncSession, org) -> None:
    user = await UserFactory.create_async(session=db_session, organization_id=org.id)

    assert user.id is not None
    fetched = (await db_session.execute(select(User).where(User.id == user.id))).scalar_one()
    assert fetched.email == user.email


async def test_savepoint_isolation_first(db_session: AsyncSession, org) -> None:
    await UserFactory.create_async(session=db_session, organization_id=org.id, email="iso@example.com")
    count = (await db_session.execute(select(User))).scalars().all()
    assert any(u.email == "iso@example.com" for u in count)


async def test_savepoint_isolation_second(db_session: AsyncSession) -> None:
    """Previous test's user must not be visible — savepoint rolled it back."""
    rows = (await db_session.execute(select(User).where(User.email == "iso@example.com"))).scalars().all()
    assert rows == []


async def test_mock_task_queue_captures_enqueue(test_app) -> None:
    """The test app wires a mocked TaskQueues; queue.enqueue is an AsyncMock."""
    queues = await test_app.dependencies["task_queues"](**{})  # type: ignore[misc]
    queue = queues.get("default")
    await queue.enqueue("health_check", payload="x")
    queue.enqueue.assert_awaited_with("health_check", payload="x")


@task("test_make_ctx_task")  # type: ignore[arg-type]
async def _ctx_probe(ctx, *, n: int) -> int:
    assert "db_sessionmaker" in ctx
    assert "queue" in ctx
    return n * 2


async def test_make_ctx_runs_task_directly(db_session: AsyncSession) -> None:
    ctx = make_ctx(db_session)
    result = await _ctx_probe(ctx, n=3)
    assert result == 6
    assert ctx["queue"].enqueue is not None
