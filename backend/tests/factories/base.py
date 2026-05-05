"""Base factory for all SQLAlchemy models."""

from typing import Any

from faker import Faker
from polyfactory.factories.sqlalchemy_factory import SQLAlchemyFactory
from sqlalchemy.ext.asyncio import AsyncSession

from app.base.models import BaseDBModel


class BaseFactory[T: BaseDBModel](SQLAlchemyFactory[T]):
    __is_base_factory__ = True
    __faker__ = Faker()
    __session__ = None
    __check_model__ = False
    __set_relationships__ = False
    __set_association_proxy__ = False
    __set_primary_key__ = False  # Let PostgreSQL sequences assign IDs

    @classmethod
    async def create_async(cls, session: AsyncSession, **kwargs: Any) -> T:  # type: ignore[override]
        instance = cls.build(**kwargs)
        session.add(instance)
        await session.flush()
        await session.refresh(instance)
        return instance

    @classmethod
    async def create_batch_async(cls, session: AsyncSession, size: int, **kwargs: Any) -> list[T]:  # type: ignore[override]
        instances = [cls.build(**kwargs) for _ in range(size)]
        for instance in instances:
            session.add(instance)
        await session.flush()
        for instance in instances:
            await session.refresh(instance)
        return instances
