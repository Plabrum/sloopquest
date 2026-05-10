"""form_dsl_columns

Revision ID: 3c34a332c09d
Revises: e229da637a4b
Create Date: 2026-05-08 03:04:33.994561+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3c34a332c09d"
down_revision: str | None = "e229da637a4b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("survey_templates", "definition_json", new_column_name="definition")
    op.add_column("surveys", sa.Column("form_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("surveys", "form_response")
    op.alter_column("survey_templates", "definition", new_column_name="definition_json")
