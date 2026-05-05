"""Add events and event_consumer_failures tables

Revision ID: a31bf7c2419d
Revises: e159feb64f82
Create Date: 2026-05-05 07:30:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a31bf7c2419d"
down_revision: str | None = "e159feb64f82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("object_type", sa.String(length=50), nullable=False),
        sa.Column("object_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("event_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_actor_id", "events", ["actor_id"])
    op.create_index("ix_events_organization_id", "events", ["organization_id"])
    op.create_index("ix_events_object", "events", ["object_type", "object_id", "created_at"])
    op.create_index("ix_events_org_created", "events", ["organization_id", "created_at"])

    op.create_table(
        "event_consumer_failures",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("consumer_key", sa.String(), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False),
        sa.Column("error", sa.Text(), nullable=False),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_consumer_failures_event_id", "event_consumer_failures", ["event_id"])
    op.create_index(
        "ix_event_consumer_failures_consumer_key",
        "event_consumer_failures",
        ["consumer_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_event_consumer_failures_consumer_key", table_name="event_consumer_failures")
    op.drop_index("ix_event_consumer_failures_event_id", table_name="event_consumer_failures")
    op.drop_table("event_consumer_failures")
    op.drop_index("ix_events_org_created", table_name="events")
    op.drop_index("ix_events_object", table_name="events")
    op.drop_index("ix_events_organization_id", table_name="events")
    op.drop_index("ix_events_actor_id", table_name="events")
    op.drop_table("events")
