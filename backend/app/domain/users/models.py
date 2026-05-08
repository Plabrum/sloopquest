from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.users.roles import Role
from app.platform.base.models import BaseDBModel
from app.utils.textenum import TextEnum

# NOTE: User and Organization deliberately do NOT use OrgRootMixin / OrgScopedMixin
# (and so are not under RLS). Other tables' RLS policies subquery `users` to
# evaluate role/org membership, and the magic-link request flow writes to both
# tables before any user session exists.


class Organization(BaseDBModel):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(sa.Text)
    phone: Mapped[str | None] = mapped_column(sa.Text)
    email: Mapped[str | None] = mapped_column(sa.Text)
    website: Mapped[str | None] = mapped_column(sa.Text)
    address_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("addresses.id", ondelete="SET NULL"),
        index=True,
    )
    nams_member_number: Mapped[str | None] = mapped_column(sa.Text)
    sams_member_number: Mapped[str | None] = mapped_column(sa.Text)
    signature_block: Mapped[str | None] = mapped_column(sa.Text)
    report_footer: Mapped[str | None] = mapped_column(sa.Text)
    stripe_account_id: Mapped[str | None] = mapped_column(sa.Text)


class User(BaseDBModel):
    __tablename__ = "users"
    __table_args__ = (sa.Index("ix_users_email", "email", unique=True),)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(sa.Text)
    email: Mapped[str] = mapped_column(sa.Text)
    email_verified: Mapped[bool] = mapped_column(default=False)
    phone: Mapped[str | None] = mapped_column(sa.Text)
    role: Mapped[Role] = mapped_column(TextEnum(Role), server_default=Role.MEMBER.name)

    organization: Mapped[Organization] = relationship("Organization", foreign_keys="User.organization_id", lazy="raise")
