"""collapse inbound_emails + email_messages into a unified email_messages table

Drops the two physical email tables, replaces them with one row-per-message
table (direction in/out, state machine). EmailThread becomes user-scoped with
optional client_id / survey_id attachments. Dev-only data is wiped.

Revision ID: a7b3c2d11ee0
Revises: e4e9efbb4bb5
Create Date: 2026-05-13 00:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op
from app.platform.comms.enums import MessageDirection, MessageState
from app.utils.sqids import SqidType
from app.utils.textenum import TextEnum

revision: str = "a7b3c2d11ee0"
down_revision: str | None = "e4e9efbb4bb5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_USER_SCOPE_POLICY = """
    AS PERMISSIVE
    FOR ALL
    USING (
        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE
        OR (NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
            AND user_id = NULLIF(current_setting('app.user_id', true), '')::int)
    )
"""


def upgrade() -> None:
    # Drop the two split tables before reshaping email_threads — they FK to it.
    op.drop_index("ix_inbound_emails_target_user_id", table_name="inbound_emails")
    op.drop_constraint("fk_inbound_emails_target_user_id_users", "inbound_emails", type_="foreignkey")
    op.drop_index("ix_inbound_emails_ses_message_id", table_name="inbound_emails")
    op.drop_index("ix_inbound_emails_s3_key", table_name="inbound_emails")
    op.drop_index("ix_inbound_emails_email_thread_id", table_name="inbound_emails")
    op.drop_table("inbound_emails")

    op.drop_index("ix_email_messages_message_id", table_name="email_messages")
    op.drop_index("ix_email_messages_email_thread_id", table_name="email_messages")
    op.drop_table("email_messages")

    op.drop_index("ix_email_threads_participant_email", table_name="email_threads")
    op.drop_column("email_threads", "participant_email")

    op.add_column("email_threads", sa.Column("user_id", SqidType(), nullable=False))
    op.create_foreign_key(
        "fk_email_threads_user_id_users",
        "email_threads",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_email_threads_user_id", "email_threads", ["user_id"])

    op.add_column("email_threads", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_email_threads_archived_at", "email_threads", ["archived_at"])

    op.add_column("email_threads", sa.Column("client_id", SqidType(), nullable=True))
    op.create_foreign_key(
        "fk_email_threads_client_id_clients",
        "email_threads",
        "clients",
        ["client_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_email_threads_client_id", "email_threads", ["client_id"])

    op.add_column("email_threads", sa.Column("survey_id", SqidType(), nullable=True))
    op.create_foreign_key(
        "fk_email_threads_survey_id_surveys",
        "email_threads",
        "surveys",
        ["survey_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_email_threads_survey_id", "email_threads", ["survey_id"])

    op.create_table(
        "email_messages",
        sa.Column("user_id", SqidType(), nullable=False),
        sa.Column("email_thread_id", SqidType(), nullable=True),
        sa.Column("direction", TextEnum(MessageDirection), nullable=False),
        sa.Column("state", TextEnum(MessageState), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("from_email", sa.Text(), nullable=True),
        sa.Column("from_name", sa.Text(), nullable=True),
        sa.Column("to_emails", sa.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("ses_message_id", sa.Text(), nullable=True),
        sa.Column("rfc_message_id", sa.Text(), nullable=True),
        sa.Column("in_reply_to", sa.Text(), nullable=True),
        sa.Column("attachments_json", sa.JSON(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("s3_bucket", sa.Text(), nullable=True),
        sa.Column("s3_key", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("spf_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("dkim_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_automated", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("reply_to_email", sa.Text(), nullable=True),
        sa.Column("template_name", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("(direction = 'OUT') OR (s3_key IS NOT NULL)", name="ck_inbound_has_s3_key"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["email_thread_id"], ["email_threads.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ses_message_id"),
        sa.UniqueConstraint("rfc_message_id"),
        sa.UniqueConstraint("s3_key"),
    )
    op.create_index("ix_email_messages_user_id", "email_messages", ["user_id"])
    op.create_index("ix_email_messages_email_thread_id", "email_messages", ["email_thread_id"])
    op.create_index("ix_email_messages_ses_message_id", "email_messages", ["ses_message_id"], unique=True)
    op.create_index("ix_email_messages_rfc_message_id", "email_messages", ["rfc_message_id"], unique=True)
    op.create_index("ix_email_messages_archived_at", "email_messages", ["archived_at"])
    op.create_index("ix_email_messages_user_archived", "email_messages", ["user_id", "archived_at"])
    op.create_index("ix_email_messages_user_thread", "email_messages", ["user_id", "email_thread_id"])

    op.enable_rls("public", "email_threads")
    op.enable_rls("public", "email_messages")

    op.execute(f"CREATE POLICY user_scope_policy on public.email_threads {_USER_SCOPE_POLICY}")
    op.execute(f"CREATE POLICY user_scope_policy on public.email_messages {_USER_SCOPE_POLICY}")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS user_scope_policy on public.email_messages")
    op.execute("DROP POLICY IF EXISTS user_scope_policy on public.email_threads")
    op.disable_rls("public", "email_messages")
    op.disable_rls("public", "email_threads")

    op.drop_index("ix_email_messages_user_thread", table_name="email_messages")
    op.drop_index("ix_email_messages_user_archived", table_name="email_messages")
    op.drop_index("ix_email_messages_archived_at", table_name="email_messages")
    op.drop_index("ix_email_messages_rfc_message_id", table_name="email_messages")
    op.drop_index("ix_email_messages_ses_message_id", table_name="email_messages")
    op.drop_index("ix_email_messages_email_thread_id", table_name="email_messages")
    op.drop_index("ix_email_messages_user_id", table_name="email_messages")
    op.drop_table("email_messages")

    op.drop_index("ix_email_threads_survey_id", table_name="email_threads")
    op.drop_constraint("fk_email_threads_survey_id_surveys", "email_threads", type_="foreignkey")
    op.drop_column("email_threads", "survey_id")

    op.drop_index("ix_email_threads_client_id", table_name="email_threads")
    op.drop_constraint("fk_email_threads_client_id_clients", "email_threads", type_="foreignkey")
    op.drop_column("email_threads", "client_id")

    op.drop_index("ix_email_threads_archived_at", table_name="email_threads")
    op.drop_column("email_threads", "archived_at")

    op.drop_index("ix_email_threads_user_id", table_name="email_threads")
    op.drop_constraint("fk_email_threads_user_id_users", "email_threads", type_="foreignkey")
    op.drop_column("email_threads", "user_id")

    op.add_column("email_threads", sa.Column("participant_email", sa.Text(), nullable=True))
    op.create_index("ix_email_threads_participant_email", "email_threads", ["participant_email"])

    op.create_table(
        "email_messages",
        sa.Column("to_email", sa.ARRAY(sa.Text()), nullable=False),
        sa.Column("from_email", sa.Text(), nullable=False),
        sa.Column("from_name", sa.Text(), nullable=True),
        sa.Column("reply_to_email", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("ses_message_id", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("email_thread_id", SqidType(), nullable=True),
        sa.Column("in_reply_to_message_id", sa.Text(), nullable=True),
        sa.Column("message_id", sa.Text(), nullable=True),
        sa.Column("template_name", sa.Text(), nullable=True),
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["email_thread_id"], ["email_threads.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ses_message_id"),
    )
    op.create_index("ix_email_messages_email_thread_id", "email_messages", ["email_thread_id"])
    op.create_index("ix_email_messages_message_id", "email_messages", ["message_id"], unique=True)

    op.create_table(
        "inbound_emails",
        sa.Column("s3_bucket", sa.Text(), nullable=False),
        sa.Column("s3_key", sa.Text(), nullable=False),
        sa.Column("ses_message_id", sa.Text(), nullable=True),
        sa.Column("from_email", sa.Text(), nullable=True),
        sa.Column("to_email", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("in_reply_to", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("task_id", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("email_thread_id", SqidType(), nullable=True),
        sa.Column("attachments_json", sa.JSON(), nullable=True),
        sa.Column("target_user_id", SqidType(), nullable=True),
        sa.Column("spf_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("dkim_pass", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_automated", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("id", SqidType(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["email_thread_id"], ["email_threads.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["target_user_id"], ["users.id"], ondelete="SET NULL", name="fk_inbound_emails_target_user_id_users"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inbound_emails_email_thread_id", "inbound_emails", ["email_thread_id"])
    op.create_index("ix_inbound_emails_s3_key", "inbound_emails", ["s3_key"], unique=True)
    op.create_index("ix_inbound_emails_ses_message_id", "inbound_emails", ["ses_message_id"], unique=True)
    op.create_index("ix_inbound_emails_target_user_id", "inbound_emails", ["target_user_id"])
