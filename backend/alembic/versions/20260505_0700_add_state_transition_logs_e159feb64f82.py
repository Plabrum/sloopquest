"""Add state_transition_logs table

Revision ID: e159feb64f82
Revises: e916c431c32c
Create Date: 2026-05-05 07:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e159feb64f82"
down_revision: str | None = "e916c431c32c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "state_transition_logs",
        sa.Column("object_type", sa.String(), nullable=False),
        sa.Column("object_id", sa.Integer(), nullable=False),
        sa.Column("from_state", sa.String(), nullable=False),
        sa.Column("to_state", sa.String(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=False),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_stl_object_lookup",
        "state_transition_logs",
        ["object_type", "object_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_stl_object_lookup", table_name="state_transition_logs")
    op.drop_table("state_transition_logs")
