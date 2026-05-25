"""add onboardings

Revision ID: 4a1f9c2d3e8b
Revises: 27ab98bb0738
Create Date: 2026-05-25 12:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.domain.onboarding.enums import OnboardingState
from app.utils.sqids import SqidType
from app.utils.textenum import TextEnum

revision: str = "4a1f9c2d3e8b"
down_revision: str | None = "27ab98bb0738"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "onboardings",
        sa.Column("user_id", SqidType(), nullable=False),
        sa.Column(
            "state",
            TextEnum(OnboardingState),
            server_default=OnboardingState.NOT_STARTED.name,
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboardings_deleted_at"), "onboardings", ["deleted_at"], unique=False)
    op.create_index("ix_onboardings_user_id", "onboardings", ["user_id"], unique=True)
    op.create_index(op.f("ix_onboardings_state"), "onboardings", ["state"], unique=False)

    # Backfill: existing users skip the modal. Defaulting them to NOT_STARTED
    # would surprise everyone on first deploy.
    op.execute(
        """
        INSERT INTO onboardings (user_id, state, started_at, completed_at, created_at, updated_at)
        SELECT id, 'COMPLETED', now(), now(), now(), now() FROM users
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_onboardings_state"), table_name="onboardings")
    op.drop_index("ix_onboardings_user_id", table_name="onboardings")
    op.drop_index(op.f("ix_onboardings_deleted_at"), table_name="onboardings")
    op.drop_table("onboardings")
