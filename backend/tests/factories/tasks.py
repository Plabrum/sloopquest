"""Factories for queue Task records."""

from datetime import UTC, datetime
from uuid import uuid4

from polyfactory import Use

from app.queue.enums import TaskStatus
from app.queue.models import Task

from .base import BaseFactory


class TaskFactory(BaseFactory):
    __model__ = Task

    job_key = Use(lambda: f"job-{uuid4()}")
    queue = "default"
    task_name = "health_check"
    status = TaskStatus.PENDING
    started_at = None
    completed_at = None
    error = None
    created_at = Use(lambda: datetime.now(tz=UTC))
    updated_at = Use(lambda: datetime.now(tz=UTC))
