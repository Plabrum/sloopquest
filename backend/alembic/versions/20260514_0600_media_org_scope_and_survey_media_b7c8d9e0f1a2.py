"""media_org_scope_and_survey_media

Adds an `organization_id` column to `media` (with RLS policy) and creates
the `survey_media` association table (with RLS policy).

NOTE: existing rows in `media` are deleted on upgrade — the only deployments
so far are local/dev. Confirmed with the user.

Revision ID: b7c8d9e0f1a2
Revises: f1e2d3c4b5a6
Create Date: 2026-05-14 06:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from alembic_utils.pg_policy import PGPolicy

from alembic import op
from app.utils.sqids import SqidType

# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1a2"
down_revision: str | None = "f1e2d3c4b5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_MEDIA_POLICY_DEF = (
    "AS PERMISSIVE\n    FOR ALL\n    USING (\n"
    "        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE\n"
    "        OR (NULLIF(current_setting('app.organization_id', true), '') IS NOT NULL\n"
    "            AND media.organization_id = NULLIF(current_setting('app.organization_id', true), '')::int)\n    )"
)

_SURVEY_MEDIA_POLICY_DEF = (
    "AS PERMISSIVE\n    FOR ALL\n    USING (\n"
    "        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE\n"
    "        OR (NULLIF(current_setting('app.organization_id', true), '') IS NOT NULL\n"
    "            AND survey_media.organization_id = NULLIF(current_setting('app.organization_id', true), '')::int)\n    )"
)


def upgrade() -> None:
    # Wipe dev data — media rows have no organization_id and can't be backfilled.
    op.execute("DELETE FROM media")

    op.add_column("media", sa.Column("organization_id", SqidType(), nullable=False))
    op.create_index(op.f("ix_media_organization_id"), "media", ["organization_id"], unique=False)
    op.create_foreign_key(
        "fk_media_organization_id",
        "media",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_table(
        "survey_media",
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("organization_id", SqidType(), nullable=False),
        sa.Column("survey_id", SqidType(), nullable=False),
        sa.Column("media_id", SqidType(), nullable=False),
        sa.Column("field_id", sa.Text(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("survey_id", "media_id"),
    )
    op.create_index(op.f("ix_survey_media_deleted_at"), "survey_media", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_survey_media_organization_id"), "survey_media", ["organization_id"], unique=False)
    op.create_index(op.f("ix_survey_media_survey_id"), "survey_media", ["survey_id"], unique=False)
    op.create_index(op.f("ix_survey_media_media_id"), "survey_media", ["media_id"], unique=False)

    media_policy = PGPolicy(
        schema="public",
        signature="org_scope_policy",
        on_entity="public.media",
        definition=_MEDIA_POLICY_DEF,
    )
    op.create_entity(media_policy)

    survey_media_policy = PGPolicy(
        schema="public",
        signature="org_scope_policy",
        on_entity="public.survey_media",
        definition=_SURVEY_MEDIA_POLICY_DEF,
    )
    op.create_entity(survey_media_policy)

    op.enable_rls("public", "media")
    op.enable_rls("public", "survey_media")


def downgrade() -> None:
    op.disable_rls("public", "survey_media")
    op.disable_rls("public", "media")

    op.drop_entity(
        PGPolicy(
            schema="public",
            signature="org_scope_policy",
            on_entity="public.survey_media",
            definition=_SURVEY_MEDIA_POLICY_DEF,
        )
    )
    op.drop_entity(
        PGPolicy(
            schema="public",
            signature="org_scope_policy",
            on_entity="public.media",
            definition=_MEDIA_POLICY_DEF,
        )
    )

    op.drop_index(op.f("ix_survey_media_media_id"), table_name="survey_media")
    op.drop_index(op.f("ix_survey_media_survey_id"), table_name="survey_media")
    op.drop_index(op.f("ix_survey_media_organization_id"), table_name="survey_media")
    op.drop_index(op.f("ix_survey_media_deleted_at"), table_name="survey_media")
    op.drop_table("survey_media")

    op.drop_constraint("fk_media_organization_id", "media", type_="foreignkey")
    op.drop_index(op.f("ix_media_organization_id"), table_name="media")
    op.drop_column("media", "organization_id")
