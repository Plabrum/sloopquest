from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class BaseDBModel(DeclarativeBase):
    """Declarative base — provides id and audit columns plus a model registry."""

    _model_registry: set[type["BaseDBModel"]] = set()

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        if hasattr(cls, "__tablename__"):
            BaseDBModel._model_registry.add(cls)

    @classmethod
    def get_all_models(cls) -> set[type["BaseDBModel"]]:
        return cls._model_registry

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    def to_dict(self) -> dict[str, Any]:
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
