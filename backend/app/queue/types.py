"""Typed AppContext for SAQ tasks.

Extend this when additional clients (email, S3, LLM, etc.) are added by their
respective tickets.
"""

from typing import Required

from saq.queue import Queue
from saq.types import Context
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.config import Config


class AppContext(Context):
    db_engine: Required[AsyncEngine]
    db_sessionmaker: Required[async_sessionmaker[AsyncSession]]
    config: Required[Config]
    queue: Required[Queue]
