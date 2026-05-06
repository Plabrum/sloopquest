"""Email thread model — groups related inbound and outbound messages."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel


class EmailThread(BaseDBModel):
    __tablename__ = "email_threads"

    subject: Mapped[str | None] = mapped_column(sa.Text)
    participant_email: Mapped[str | None] = mapped_column(sa.Text, index=True)
