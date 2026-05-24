"""add_org_id_to_sub_tables

Revision ID: 933bb98abf94
Revises: 6b45fd3c4997
Create Date: 2026-05-12 04:15:56.892789+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.utils.sqids import SqidType

# revision identifiers, used by Alembic.
revision: str = "933bb98abf94"
down_revision: str | None = "6b45fd3c4997"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_BACKFILLS = [
    ("engines", "vessel_id", "vessels"),
    ("invoice_line_items", "invoice_id", "invoices"),
    ("pricing_tiers", "guide_id", "pricing_guides"),
    ("quote_line_items", "quote_id", "quotes"),
]


def upgrade() -> None:
    for table, parent_fk, parent_table in _BACKFILLS:
        op.add_column(table, sa.Column("organization_id", SqidType(), nullable=True))
        op.execute(
            f"UPDATE {table} SET organization_id = "
            f"(SELECT organization_id FROM {parent_table} WHERE {parent_table}.id = {table}.{parent_fk})"
        )
        op.alter_column(table, "organization_id", nullable=False)
        op.create_index(op.f(f"ix_{table}_organization_id"), table, ["organization_id"], unique=False)
        op.create_foreign_key(
            f"fk_{table}_organization_id",
            table,
            "organizations",
            ["organization_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade() -> None:
    for table, _parent_fk, _parent_table in reversed(_BACKFILLS):
        op.drop_constraint(f"fk_{table}_organization_id", table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_organization_id"), table_name=table)
        op.drop_column(table, "organization_id")
