"""Add llm_threads and llm_messages tables

Revision ID: d2e3f4a5b6c7
Revises: c1a2b3c4d5e6
Create Date: 2026-05-05 09:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e3f4a5b6c7"
down_revision: str | tuple[str, ...] | None = "c1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "llm_threads",
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("threadable_type", sa.Text(), nullable=True),
        sa.Column("threadable_id", sa.Integer(), nullable=True),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_llm_threads_user_id", "llm_threads", ["user_id"])
    op.create_index("ix_llm_threads_threadable_type", "llm_threads", ["threadable_type"])
    op.create_index("ix_llm_threads_threadable_id", "llm_threads", ["threadable_id"])

    op.create_table(
        "llm_messages",
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "user",
                "assistant",
                "assistant_tool",
                "tool_result",
                name="llm_message_role",
            ),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["llm_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_llm_messages_thread_id", "llm_messages", ["thread_id"])


def downgrade() -> None:
    op.drop_index("ix_llm_messages_thread_id", table_name="llm_messages")
    op.drop_table("llm_messages")

    op.drop_index("ix_llm_threads_threadable_id", table_name="llm_threads")
    op.drop_index("ix_llm_threads_threadable_type", table_name="llm_threads")
    op.drop_index("ix_llm_threads_user_id", table_name="llm_threads")
    op.drop_table("llm_threads")

    sa.Enum(name="llm_message_role").drop(op.get_bind(), checkfirst=True)
