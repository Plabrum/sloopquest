"""LLM thread + message persistence models.

LLM threads are distinct from the WebSocket-backed `Thread` model in
`app/threads/`. They store the full LLM message history (including tool-use
and tool-result blocks) so a conversation can be resumed.

Threads are polymorphically linkable to a domain object via
`(threadable_type, threadable_id)` — e.g. a survey or vessel inspection.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.platform.base.models import BaseDBModel
from app.platform.llm.enums import MessageRole


class LLMThread(BaseDBModel):
    __tablename__ = "llm_threads"

    user_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True, index=True)

    threadable_type: Mapped[str | None] = mapped_column(sa.Text, nullable=True, index=True)
    threadable_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True, index=True)

    messages: Mapped[list[LLMMessage]] = relationship(
        "LLMMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="LLMMessage.id",
    )


class LLMMessage(BaseDBModel):
    __tablename__ = "llm_messages"

    thread_id: Mapped[int] = mapped_column(
        sa.ForeignKey("llm_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        sa.Enum(MessageRole, values_callable=lambda x: [e.value for e in x], name="llm_message_role"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)

    thread: Mapped[LLMThread] = relationship("LLMThread", back_populates="messages")
