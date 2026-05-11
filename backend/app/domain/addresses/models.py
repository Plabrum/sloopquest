from __future__ import annotations

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.base.search import SearchMixin


class Address(SearchMixin, BaseDBModel):
    trgm_columns = ["line1", "city", "region", "postal_code"]
    search_label_field = "line1"
    search_entity_type = "address"
    search_detail_prefix = "/addresses"
    __tablename__ = "addresses"

    line1: Mapped[str] = mapped_column(sa.Text)
    line2: Mapped[str | None] = mapped_column(sa.Text)
    city: Mapped[str] = mapped_column(sa.Text)
    region: Mapped[str] = mapped_column(sa.Text)
    postal_code: Mapped[str] = mapped_column(sa.Text)
    country: Mapped[str] = mapped_column(sa.Text, server_default="US")
    lat: Mapped[Decimal | None] = mapped_column(sa.Numeric(9, 6))
    lng: Mapped[Decimal | None] = mapped_column(sa.Numeric(9, 6))
