from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel, TimestampMixin


class Manufacturer(TimestampMixin, BaseDBModel):
    __tablename__ = "manufacturers"

    name: Mapped[str] = mapped_column(sa.Text)
    country: Mapped[str | None] = mapped_column(sa.Text)
    website: Mapped[str | None] = mapped_column(sa.Text)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
