"""rework_search_vectors

Revision ID: a1b2c3d4e5f6
Revises: 9ba7aed24094
Create Date: 2026-05-10 12:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "9ba7aed24094"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Tables with only trgm (no FTS search_vector)
_TRGM_ONLY = {
    "addresses": "coalesce(line1, '') || ' ' || coalesce(city, '') || ' ' || coalesce(region, '') || ' ' || coalesce(postal_code, '')",
    "clients": "coalesce(display_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(company_name, '')",
    "manufacturers": "coalesce(name, '') || ' ' || coalesce(country, '')",
    "survey_templates": "coalesce(name, '')",
    "users": "coalesce(name, '') || ' ' || coalesce(email, '')",
    "vessels": "coalesce(name, '') || ' ' || coalesce(hin, '') || ' ' || coalesce(model, '')",
}

# Tables with both trgm and FTS
_TRGM_AND_FTS = {
    "invoices": {
        "trgm": "coalesce(invoice_number, '')",
        "fts": "coalesce(notes, '')",
    },
    "parts": {
        "trgm": "coalesce(name, '') || ' ' || coalesce(part_number, '')",
        "fts": "coalesce(description, '')",
    },
    "reports": {
        "trgm": "coalesce(title, '')",
        "fts": "coalesce(summary, '')",
    },
}

_ALL_TABLES = list(_TRGM_ONLY) + list(_TRGM_AND_FTS)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Drop old search_vector columns (wrong expressions on all tables)
    for table in _ALL_TABLES:
        op.drop_column(table, "search_vector")

    # Add search_trgm to all tables
    for table, expression in _TRGM_ONLY.items():
        op.add_column(
            table,
            sa.Column("search_trgm", sa.Text, sa.Computed(expression, persisted=True), nullable=True),
        )
    for table, exprs in _TRGM_AND_FTS.items():
        op.add_column(
            table,
            sa.Column("search_trgm", sa.Text, sa.Computed(exprs["trgm"], persisted=True), nullable=True),
        )

    # Add corrected search_vector to FTS tables only
    for table, exprs in _TRGM_AND_FTS.items():
        op.add_column(
            table,
            sa.Column(
                "search_vector",
                postgresql.TSVECTOR(),
                sa.Computed(f"to_tsvector('english', {exprs['fts']})", persisted=True),
                nullable=True,
            ),
        )

    # GIN indexes for trgm (must use operator class — executed raw)
    for table in _ALL_TABLES:
        op.execute(f"CREATE INDEX ix_{table}_trgm ON {table} USING GIN (search_trgm gin_trgm_ops)")

    # GIN indexes for FTS search_vector
    for table in _TRGM_AND_FTS:
        op.execute(f"CREATE INDEX ix_{table}_search_vector ON {table} USING GIN (search_vector)")


def downgrade() -> None:
    # Drop GIN indexes
    for table in _TRGM_AND_FTS:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_search_vector")
    for table in _ALL_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_trgm")

    # Drop new columns (IF EXISTS — DB may have skipped this migration)
    for table in _TRGM_AND_FTS:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS search_vector")
    for table in _ALL_TABLES:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS search_trgm")

    # Restore old search_vector columns (all tables, original expressions)
    _old_expressions = {
        "addresses": "to_tsvector('english', coalesce(line1, '') || ' ' || coalesce(city, '') || ' ' || coalesce(region, '') || ' ' || coalesce(postal_code, ''))",
        "clients": "to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(company_name, ''))",
        "invoices": "to_tsvector('english', coalesce(invoice_number, '') || ' ' || coalesce(notes, ''))",
        "manufacturers": "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(country, ''))",
        "parts": "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(part_number, '') || ' ' || coalesce(description, ''))",
        "reports": "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))",
        "survey_templates": "to_tsvector('english', coalesce(name, ''))",
        "users": "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, ''))",
        "vessels": "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(hin, '') || ' ' || coalesce(model, ''))",
    }
    for table, expr in _old_expressions.items():
        op.add_column(
            table,
            sa.Column(
                "search_vector",
                postgresql.TSVECTOR(),
                sa.Computed(expr, persisted=True),
                nullable=True,
            ),
        )

    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
