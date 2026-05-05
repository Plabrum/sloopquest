"""Inbound email model — emails received via SES → S3 → Lambda → webhook."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.base.models import BaseDBModel


class InboundEmail(BaseDBModel):
    __tablename__ = "inbound_emails"

    # S3 location (idempotency key — unique index prevents double-processing)
    s3_bucket: Mapped[str] = mapped_column(sa.Text)
    s3_key: Mapped[str] = mapped_column(sa.Text, unique=True, index=True)

    # SES metadata
    ses_message_id: Mapped[str | None] = mapped_column(sa.Text, unique=True, index=True)

    # Parsed headers
    from_email: Mapped[str | None] = mapped_column(sa.Text)
    to_email: Mapped[str | None] = mapped_column(sa.Text)
    subject: Mapped[str | None] = mapped_column(sa.Text)
    received_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    in_reply_to: Mapped[str | None] = mapped_column(sa.Text)

    # Processing state
    processed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    task_id: Mapped[str | None] = mapped_column(sa.Text)

    # Parsed body
    body_text: Mapped[str | None] = mapped_column(sa.Text)
    body_html: Mapped[str | None] = mapped_column(sa.Text)

    # Thread linkage
    email_thread_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("email_threads.id", ondelete="SET NULL"), index=True
    )

    # {"attachments": [{filename, s3_key, content_type, size}]}
    attachments_json: Mapped[dict | None] = mapped_column(sa.JSON)

    def __repr__(self) -> str:
        return f"<InboundEmail(id={self.id}, from={self.from_email!r}, subject={self.subject!r})>"
