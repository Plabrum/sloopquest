"""stripe billing buildout

Moves stripe_customer_id from subscriptions → organizations, swaps
payment_link_url → stripe_payment_intent_id on invoices, creates
the payment_methods table.

Revision ID: b4f2c8e91a3d
Revises: a7b3c2d11ee0
Create Date: 2026-05-11 12:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.utils.sqids import SqidType

revision: str = "b4f2c8e91a3d"
down_revision: str | None = "d8a968b85ea7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add stripe_customer_id to organizations
    op.add_column("organizations", sa.Column("stripe_customer_id", sa.Text(), nullable=True))

    # Copy existing customer IDs from subscriptions → organizations
    op.execute("""
        UPDATE organizations SET stripe_customer_id = (
            SELECT stripe_customer_id FROM subscriptions
            WHERE subscriptions.organization_id = organizations.id
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM subscriptions
            WHERE subscriptions.organization_id = organizations.id
            AND subscriptions.stripe_customer_id IS NOT NULL
        )
    """)

    # Drop stripe_customer_id from subscriptions
    op.drop_column("subscriptions", "stripe_customer_id")

    # Swap payment_link_url → stripe_payment_intent_id on invoices
    op.add_column("invoices", sa.Column("stripe_payment_intent_id", sa.Text(), nullable=True))
    op.drop_column("invoices", "payment_link_url")

    # Create payment_methods table
    op.create_table(
        "payment_methods",
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("organization_id", SqidType(), nullable=False),
        sa.Column("stripe_payment_method_id", sa.Text(), nullable=False),
        sa.Column("brand", sa.Text(), nullable=False),
        sa.Column("last4", sa.Text(), nullable=False),
        sa.Column("exp_month", sa.Integer(), nullable=False),
        sa.Column("exp_year", sa.Integer(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_payment_method_id"),
    )
    op.create_index("ix_payment_methods_organization_id", "payment_methods", ["organization_id"])
    op.create_index("ix_payment_methods_deleted_at", "payment_methods", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_payment_methods_deleted_at", table_name="payment_methods")
    op.drop_index("ix_payment_methods_organization_id", table_name="payment_methods")
    op.drop_table("payment_methods")

    op.add_column("invoices", sa.Column("payment_link_url", sa.Text(), nullable=True))
    op.drop_column("invoices", "stripe_payment_intent_id")

    op.add_column("subscriptions", sa.Column("stripe_customer_id", sa.Text(), nullable=True))
    op.drop_column("organizations", "stripe_customer_id")
