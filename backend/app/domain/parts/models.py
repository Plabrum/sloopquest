from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.manufacturers.models import Manufacturer
from app.domain.parts.enums import PartCategory
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class Part(TimestampMixin, BaseDBModel):
    __tablename__ = "parts"

    name: Mapped[str] = mapped_column(sa.Text)
    part_number: Mapped[str | None] = mapped_column(sa.Text)
    description: Mapped[str | None] = mapped_column(sa.Text)
    category: Mapped[PartCategory | None] = mapped_column(TextEnum(PartCategory))

    manufacturer_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("manufacturers.id", ondelete="SET NULL"),
        index=True,
    )
    manufacturer: Mapped[Manufacturer | None] = relationship(
        "Manufacturer",
        foreign_keys=[manufacturer_id],
        lazy="raise",
    )

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
