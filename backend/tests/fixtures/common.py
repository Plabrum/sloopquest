"""Common domain object fixtures."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.factories.users import OrgFactory, UserFactory


@pytest.fixture
async def org(db_session: AsyncSession):
    instance = await OrgFactory.create_async(session=db_session)
    await db_session.flush()
    return instance


@pytest.fixture
async def user(db_session: AsyncSession, org):
    instance = await UserFactory.create_async(session=db_session, organization_id=org.id)
    await db_session.flush()
    return instance
