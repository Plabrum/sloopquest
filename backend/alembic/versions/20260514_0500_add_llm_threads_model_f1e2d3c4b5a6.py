"""add_llm_threads_model

Revision ID: f1e2d3c4b5a6
Revises: 9ea0462a0d82
Create Date: 2026-05-14 05:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1e2d3c4b5a6"
down_revision: str | None = "9ea0462a0d82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("llm_threads", sa.Column("model", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("llm_threads", "model")
