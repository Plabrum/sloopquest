from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.addresses.models import Address
from app.domain.clients.enums import ClientType
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.base.search import SearchMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class Client(SearchMixin, TimestampMixin, BaseDBModel):
    trgm_columns = ["display_name", "email", "first_name", "last_name", "company_name"]
    search_label_field = "display_name"
    search_entity_type = "client"
    search_detail_prefix = "/clients"
    __tablename__ = "clients"

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Sqid | None] = mapped_column(SqidType, sa.ForeignKey("users.id", ondelete="SET NULL"), index=True)
    client_type: Mapped[ClientType] = mapped_column(TextEnum(ClientType), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(sa.Text)
    email: Mapped[str | None] = mapped_column(sa.Text)
    phone: Mapped[str | None] = mapped_column(sa.Text)

    billing_address_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("addresses.id", ondelete="SET NULL"),
        index=True,
    )
    billing_address: Mapped[Address | None] = relationship(
        "Address",
        foreign_keys=[billing_address_id],
        lazy="raise",
    )

    first_name: Mapped[str | None] = mapped_column(sa.Text)
    last_name: Mapped[str | None] = mapped_column(sa.Text)
    company_name: Mapped[str | None] = mapped_column(sa.Text)
    claim_contact_name: Mapped[str | None] = mapped_column(sa.Text)
    institution_name: Mapped[str | None] = mapped_column(sa.Text)
    loan_officer_name: Mapped[str | None] = mapped_column(sa.Text)
    brokerage_name: Mapped[str | None] = mapped_column(sa.Text)
    agent_name: Mapped[str | None] = mapped_column(sa.Text)
    license_number: Mapped[str | None] = mapped_column(sa.Text)
