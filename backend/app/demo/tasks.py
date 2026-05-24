"""Fixtures runner — wipe and repopulate the demo organization."""

import logging

from .seed import seed_demo_org
from .wipe import wipe_demo_org

logger = logging.getLogger(__name__)


async def run_fixtures_standalone() -> None:
    """Run the fixture seed outside of the SAQ worker (e.g. `just fixtures`).

    Creates its own engine and session, then commits.
    """
    from sqlalchemy import text  # noqa: PLC0415
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: PLC0415

    from app.config import config  # noqa: PLC0415
    from app.utils.discovery import discover_and_import  # noqa: PLC0415

    if config.ENV == "production":
        raise SystemExit("Refusing to seed: ENV=production")

    # Ensure all models are imported so SQLAlchemy mapper is complete
    discover_and_import(["models.py", "models/**/*.py"], base_path="app")

    engine = create_async_engine(config.ASYNC_DATABASE_URL)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with sessionmaker() as session:
        async with session.begin():
            await session.execute(text("SET LOCAL app.is_system_mode = true"))
            wiped = await wipe_demo_org(session)
            if wiped:
                logger.info("Wiped existing demo org")
            await seed_demo_org(session)

    await engine.dispose()
    logger.info("Fixture seed finished")


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    asyncio.run(run_fixtures_standalone())
