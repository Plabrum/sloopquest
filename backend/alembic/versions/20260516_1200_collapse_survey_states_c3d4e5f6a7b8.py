"""collapse survey states from 8 to 4

Drops `inquiry`, `quoted`, `in_field`, `in_review`. Remaps existing rows:
inquiry/quoted/scheduled -> scheduled; in_field/in_draft/in_review -> in_draft.

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-05-16 12:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b7c8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE surveys SET state = 'scheduled' WHERE state IN ('inquiry', 'quoted')"))
    op.execute(sa.text("UPDATE surveys SET state = 'in_draft' WHERE state IN ('in_field', 'in_review')"))
    op.alter_column("surveys", "state", server_default="scheduled")


def downgrade() -> None:
    op.alter_column("surveys", "state", server_default="inquiry")
