from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.base.models import BaseDBModel
from app.users.roles import Role

# NOTE: User and Organization deliberately do NOT use OrgRootMixin / OrgScopedMixin
# (and so are not under RLS). Other tables' RLS policies subquery `users` to
# evaluate role/org membership, and the magic-link request flow writes to both
# tables before any user session exists.


class Organization(BaseDBModel):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(sa.Text)


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
    role: Mapped[str] = mapped_column(sa.Text, server_default=Role.CLIENT)

    organization: Mapped[Organization] = relationship("Organization", foreign_keys="User.organization_id", lazy="raise")

    @property
    def role_enum(self) -> Role:
        return Role(self.role)
