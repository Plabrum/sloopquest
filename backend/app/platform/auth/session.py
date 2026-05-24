from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import config
from app.domain.users.models import User
from app.domain.users.queries import get_user_by_email

DEMO_USER_EMAIL = "demo@sloopquest.com"


async def get_dev_demo_user(session_factory: async_sessionmaker) -> User | None:
    """In dev, return the demo user so unauthenticated requests auto-login."""
    if not config.IS_DEV:
        return None
    async with session_factory() as db:
        return await get_user_by_email(db, DEMO_USER_EMAIL)
