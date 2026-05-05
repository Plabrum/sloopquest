from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.base.models import BaseDBModel
from app.queue.enums import TaskStatus


class Task(BaseDBModel):
    __tablename__ = "tasks"

    job_key: Mapped[str] = mapped_column(sa.Text, index=True, unique=True)
    queue: Mapped[str] = mapped_column(sa.Text)
    task_name: Mapped[str] = mapped_column(sa.Text, index=True)
    status: Mapped[TaskStatus] = mapped_column(sa.Text)
    started_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(sa.Text)
