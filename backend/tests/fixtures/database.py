"""Database fixtures with savepoint-based test isolation.

Each test runs inside a SAVEPOINT on a connection that never commits.
Teardown rolls back the savepoint, leaving the schema clean. Faster than
truncating tables and avoids migration-state pollution.
"""

import os
import subprocess
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import TestConfig


@pytest.fixture(scope="session")
def test_config() -> TestConfig:
    return TestConfig()


@pytest.fixture(scope="session")
def test_engine(test_config: TestConfig):
    return create_async_engine(test_config.ASYNC_DATABASE_URL, echo=False, poolclass=NullPool)


@pytest.fixture(scope="session")
def setup_database(test_engine, test_config: TestConfig):
    """Drop schema, run Alembic migrations, yield, then clean up."""
    admin_engine = create_engine(test_config.ADMIN_DB_URL, poolclass=NullPool)

    with admin_engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))

    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=Path(__file__).parent.parent.parent,
        capture_output=True,
        text=True,
        env={**os.environ, "ENV": "testing"},
    )
    if result.returncode != 0:
        raise RuntimeError(f"Alembic migration failed:\n{result.stderr}")

    yield

    with admin_engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    admin_engine.dispose()


@pytest.fixture
async def db_session(test_engine, setup_database) -> AsyncGenerator[AsyncSession]:
    """Function-scoped session in system mode for fixture creation.

    Each test runs inside a SAVEPOINT. The outer transaction is never committed —
    it rolls back at the end of the test, undoing all changes.
    System mode bypasses RLS so factories can seed data freely.
    """
    connection = await test_engine.connect()
    transaction = await connection.begin()

    await connection.execute(text("SET LOCAL app.is_system_mode = true"))

    session = async_sessionmaker(
        bind=connection,
        expire_on_commit=False,
        autoflush=False,
        join_transaction_mode="create_savepoint",
    )()

    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()


@pytest.fixture
async def transaction(db_session: AsyncSession, user) -> AsyncGenerator[AsyncSession]:
    """Session with RLS enforced for the given user.

    Use this fixture (instead of db_session) when testing user-scoped queries.
    Fixtures should be created via db_session before this takes effect.
    """
    await db_session.execute(text(f"SET LOCAL app.user_id = {int(user.id)}"))
    await db_session.execute(text(f"SET LOCAL app.organization_id = {int(user.organization_id)}"))
    await db_session.execute(text("SET LOCAL app.is_system_mode = false"))
    yield db_session
