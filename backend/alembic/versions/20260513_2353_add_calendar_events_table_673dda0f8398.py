"""add_calendar_events_table

Revision ID: 673dda0f8398
Revises: 011ee764f8d0
Create Date: 2026-05-13 23:53:20.680767+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from alembic_utils.pg_policy import PGPolicy
from sqlalchemy.dialects import postgresql

from alembic import op
from app.domain.calendar_events.enums import CalendarEventState
from app.utils.sqids import SqidType
from app.utils.textenum import TextEnum

revision: str = "673dda0f8398"
down_revision: str | None = "011ee764f8d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_calendar_events_org_policy = PGPolicy(
    schema="public",
    signature="org_scope_policy",
    on_entity="public.calendar_events",
    definition=(
        "AS PERMISSIVE\n    FOR ALL\n    USING (\n"
        "        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE\n"
        "        OR (NULLIF(current_setting('app.organization_id', true), '') IS NOT NULL\n"
        "            AND calendar_events.organization_id = NULLIF(current_setting('app.organization_id', true), '')::int)\n"
        "    )"
    ),
)


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("organization_id", SqidType(), nullable=False),
        sa.Column("start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("address_id", SqidType(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("attendees", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("survey_id", SqidType(), nullable=True),
        sa.Column("client_id", SqidType(), nullable=True),
        sa.Column("state", TextEnum(CalendarEventState), server_default="tentative", nullable=False),
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["address_id"], ["addresses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_calendar_events_address_id"), "calendar_events", ["address_id"], unique=False)
    op.create_index(op.f("ix_calendar_events_client_id"), "calendar_events", ["client_id"], unique=False)
    op.create_index(op.f("ix_calendar_events_deleted_at"), "calendar_events", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_calendar_events_end"), "calendar_events", ["end"], unique=False)
    op.create_index(op.f("ix_calendar_events_organization_id"), "calendar_events", ["organization_id"], unique=False)
    op.create_index(op.f("ix_calendar_events_start"), "calendar_events", ["start"], unique=False)
    op.create_index(op.f("ix_calendar_events_state"), "calendar_events", ["state"], unique=False)
    op.create_index(op.f("ix_calendar_events_survey_id"), "calendar_events", ["survey_id"], unique=False)

    op.create_entity(_calendar_events_org_policy)
    op.enable_rls("public", "calendar_events")


def downgrade() -> None:
    op.disable_rls("public", "calendar_events")
    op.drop_entity(_calendar_events_org_policy)

    op.drop_index(op.f("ix_calendar_events_survey_id"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_state"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_start"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_organization_id"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_end"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_deleted_at"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_client_id"), table_name="calendar_events")
    op.drop_index(op.f("ix_calendar_events_address_id"), table_name="calendar_events")
    op.drop_table("calendar_events")
