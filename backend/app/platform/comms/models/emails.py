"""Outbound email message model — one row per send attempt."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.comms.enums import EmailMessageStatus


class EmailMessage(BaseDBModel):
    __tablename__ = "email_messages"

    # Recipients
    to_email: Mapped[list[str]] = mapped_column(sa.ARRAY(sa.Text))
    from_email: Mapped[str] = mapped_column(sa.Text)
    from_name: Mapped[str | None] = mapped_column(sa.Text)
    reply_to_email: Mapped[str | None] = mapped_column(sa.Text)

    # Content
    subject: Mapped[str] = mapped_column(sa.Text)
    body_html: Mapped[str] = mapped_column(sa.Text)
    body_text: Mapped[str] = mapped_column(sa.Text)

    # SES tracking
    ses_message_id: Mapped[str | None] = mapped_column(sa.Text, unique=True)
    sent_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))

    # Attempt outcome
    status: Mapped[EmailMessageStatus] = mapped_column(
        sa.Enum(EmailMessageStatus, name="emailmessagestatus"),
        default=EmailMessageStatus.PENDING,
    )
    error_message: Mapped[str | None] = mapped_column(sa.Text)

    # Thread linkage
    email_thread_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("email_threads.id", ondelete="SET NULL"), index=True
    )

    # Threading headers
    in_reply_to_message_id: Mapped[str | None] = mapped_column(sa.Text)
    message_id: Mapped[str | None] = mapped_column(sa.Text, unique=True, index=True)

    template_name: Mapped[str | None] = mapped_column(sa.Text)

    def __repr__(self) -> str:
        return f"<EmailMessage(id={self.id}, to={self.to_email[0] if self.to_email else ''}, status={self.status})>"
