"""rename_length_to_until_ft

Revision ID: 8b1186520fa5
Revises: b00e1fd26fbe
Create Date: 2026-05-25 15:50:56.477590+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8b1186520fa5"
down_revision: str | None = "b00e1fd26fbe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("pricing_tiers", "length_min_ft")
    op.alter_column("pricing_tiers", "length_max_ft", new_column_name="length_until_ft")
    op.execute(
        """
        UPDATE pricing_tiers
        SET service_type = CASE
            WHEN service_type IS NULL THEN NULL
            WHEN lower(service_type) LIKE '%pre%purchase%' THEN 'pre_purchase'
            WHEN lower(service_type) LIKE '%insurance%' THEN 'insurance'
            WHEN lower(service_type) LIKE '%damage%' THEN 'damage'
            WHEN lower(service_type) LIKE '%sea%trial%' THEN 'sea_trial'
            WHEN lower(service_type) LIKE '%delivery%' THEN 'delivery'
            WHEN lower(service_type) LIKE '%consult%' THEN 'consultation'
            ELSE 'other'
        END
        """
    )


def downgrade() -> None:
    op.alter_column("pricing_tiers", "length_until_ft", new_column_name="length_max_ft")
    op.add_column(
        "pricing_tiers",
        sa.Column("length_min_ft", sa.NUMERIC(precision=6, scale=2), autoincrement=False, nullable=True),
    )
