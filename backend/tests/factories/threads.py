"""Factories for Thread / Message."""

from datetime import UTC, datetime

from polyfactory import Use

from app.threads.models import Message, Thread

from .base import BaseFactory


class ThreadFactory(BaseFactory):
    __model__ = Thread

    threadable_type = "test_object"
    threadable_id = Use(lambda: 1)
    created_at = Use(lambda: datetime.now(tz=UTC))
    updated_at = Use(lambda: datetime.now(tz=UTC))


class MessageFactory(BaseFactory):
    __model__ = Message

    user_id = None
    content = Use(lambda: {"type": "doc", "content": []})
    deleted_at = None
    created_at = Use(lambda: datetime.now(tz=UTC))
    updated_at = Use(lambda: datetime.now(tz=UTC))
