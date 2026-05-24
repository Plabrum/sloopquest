"""add inbox_local_part to users + routing/auth columns to inbound_emails

Revision ID: e4e9efbb4bb5
Revises: 7d4e45347b6f
Create Date: 2026-05-12 00:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.utils.sqids import SqidType

revision: str = "e4e9efbb4bb5"
down_revision: str | None = "7d4e45347b6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("inbox_local_part", sa.Text(), nullable=True))
    # Partial unique: NULLs allowed for users who have not claimed an inbox yet.
    op.create_index(
        "ix_users_inbox_local_part",
        "users",
        ["inbox_local_part"],
        unique=True,
        postgresql_where=sa.text("inbox_local_part IS NOT NULL"),
    )

    op.add_column(
        "inbound_emails",
        sa.Column("target_user_id", SqidType(), nullable=True),
    )
    op.create_foreign_key(
        "fk_inbound_emails_target_user_id_users",
        "inbound_emails",
        "users",
        ["target_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_inbound_emails_target_user_id",
        "inbound_emails",
        ["target_user_id"],
        unique=False,
    )

    op.add_column(
        "inbound_emails",
        sa.Column("spf_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "inbound_emails",
        sa.Column("dkim_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "inbound_emails",
        sa.Column("is_automated", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("inbound_emails", "is_automated")
    op.drop_column("inbound_emails", "dkim_pass")
    op.drop_column("inbound_emails", "spf_pass")
    op.drop_index("ix_inbound_emails_target_user_id", table_name="inbound_emails")
    op.drop_constraint("fk_inbound_emails_target_user_id_users", "inbound_emails", type_="foreignkey")
    op.drop_column("inbound_emails", "target_user_id")
    op.drop_index("ix_users_inbox_local_part", table_name="users")
    op.drop_column("users", "inbox_local_part")
