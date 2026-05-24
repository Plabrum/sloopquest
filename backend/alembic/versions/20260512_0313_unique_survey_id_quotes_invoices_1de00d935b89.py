"""unique_survey_id_quotes_invoices

Revision ID: 1de00d935b89
Revises: c4f1a2b6dd01
Create Date: 2026-05-12 03:13:43.805591+00:00

"""

from typing import Sequence

from alembic import op

revision: str = "1de00d935b89"
down_revision: str | None = "c4f1a2b6dd01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE surveys SET state = 'delivered' WHERE state = 'paid'")

    op.drop_index("ix_quotes_survey_id", table_name="quotes")
    op.create_index("ix_quotes_survey_id", "quotes", ["survey_id"], unique=True)

    op.drop_index("ix_invoices_survey_id", table_name="invoices")
    op.create_index("ix_invoices_survey_id", "invoices", ["survey_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_invoices_survey_id", table_name="invoices")
    op.create_index("ix_invoices_survey_id", "invoices", ["survey_id"], unique=False)

    op.drop_index("ix_quotes_survey_id", table_name="quotes")
    op.create_index("ix_quotes_survey_id", "quotes", ["survey_id"], unique=False)
