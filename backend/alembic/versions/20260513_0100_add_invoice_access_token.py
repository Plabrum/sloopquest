"""add invoice access_token

Revision ID: c4f1a2b6dd01
Revises: a7b3c2d11ee0
Create Date: 2026-05-13 01:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c4f1a2b6dd01"
down_revision: str | None = "031623e5f5e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("access_token", sa.Text(), nullable=True))
    op.create_index(
        "ix_invoices_access_token",
        "invoices",
        ["access_token"],
        unique=True,
        postgresql_where=sa.text("access_token IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_access_token", table_name="invoices")
    op.drop_column("invoices", "access_token")
