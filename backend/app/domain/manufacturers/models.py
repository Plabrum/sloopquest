from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.base.search import SearchMixin


class Manufacturer(SearchMixin, TimestampMixin, BaseDBModel):
    trgm_columns = ["name", "country"]
    search_label_field = "name"
    search_entity_type = "manufacturer"
    search_detail_prefix = "/manufacturers"
    __tablename__ = "manufacturers"

    name: Mapped[str] = mapped_column(sa.Text)
    country: Mapped[str | None] = mapped_column(sa.Text)
    website: Mapped[str | None] = mapped_column(sa.Text)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
