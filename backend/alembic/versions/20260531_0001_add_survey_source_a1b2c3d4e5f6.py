"""add_survey_source

Adds `source`, `source_message_id`, and `source_attachment_index` to surveys,
backing the IMPORTED-from-PDF provenance flag and idempotency dedupe key
for the document extraction platform.

Revision ID: a1b2c3d4e5f6
Revises: c958e45f450b
Create Date: 2026-05-31 00:01:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.domain.surveys.enums import SurveySource
from app.utils.sqids import SqidType
from app.utils.textenum import TextEnum

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "c958e45f450b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "surveys",
        sa.Column(
            "source",
            TextEnum(SurveySource),
            nullable=False,
            server_default=SurveySource.MANUAL.name,
        ),
    )
    op.add_column(
        "surveys",
        sa.Column("source_message_id", SqidType(), nullable=True),
    )
    op.add_column(
        "surveys",
        sa.Column("source_attachment_index", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_surveys_source_message_id",
        "surveys",
        "email_messages",
        ["source_message_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_surveys_source_message_id",
        "surveys",
        ["source_message_id"],
    )
    # Partial unique index: at most one IMPORTED survey per (message, attachment).
    # Idempotency key for the per-attachment import task.
    op.execute(
        "CREATE UNIQUE INDEX uq_surveys_imported_source "
        "ON surveys (source_message_id, source_attachment_index) "
        "WHERE source = 'IMPORTED'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_surveys_imported_source")
    op.drop_index("ix_surveys_source_message_id", table_name="surveys")
    op.drop_constraint("fk_surveys_source_message_id", "surveys", type_="foreignkey")
    op.drop_column("surveys", "source_attachment_index")
    op.drop_column("surveys", "source_message_id")
    op.drop_column("surveys", "source")
