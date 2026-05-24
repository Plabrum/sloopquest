"""Tests for the inbox thread list — aggregates + Sent/Unread chip filters."""

# pyright: reportArgumentType=false, reportPrivateUsage=false, reportAttributeAccessIssue=false

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.inbox.routes import _email_thread_controller
from app.platform.base.filters import BooleanFilter
from app.platform.base.schemas import ListRequest
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message


def _msg(**overrides) -> Message:
    base = dict(
        direction=MessageDirection.IN,
        state=MessageState.RECEIVED,
        subject="hi",
        body_text="hello world",
        from_email="acme@example.com",
        from_name="Acme",
        to_emails=["me@sloopquest.test"],
        s3_key=None,
    )
    base.update(overrides)
    return Message(**base)


async def _list(db_session: AsyncSession, user, **list_kwargs):
    controller = _email_thread_controller(owner=None)  # type: ignore[arg-type]
    return await controller.list_handler.fn(
        controller,
        data=ListRequest(**list_kwargs),
        user=user,
        transaction=db_session,
    )


@pytest.fixture
async def threads_with_messages(db_session: AsyncSession, user):
    """Three threads:
    - A: 2 inbound, 1 unread — latest from Acme
    - B: 1 outbound only — latest is OUT
    - C: 1 inbound, all read
    """
    now = datetime.now(tz=UTC)

    a = EmailThread(user_id=user.id, subject="A topic")
    b = EmailThread(user_id=user.id, subject="B topic")
    c = EmailThread(user_id=user.id, subject="C topic")
    db_session.add_all([a, b, c])
    await db_session.flush()

    a_old = _msg(user_id=user.id, email_thread_id=a.id, s3_key="a-old", read_at=now, body_text="old", from_name="Acme")
    a_new = _msg(user_id=user.id, email_thread_id=a.id, s3_key="a-new", body_text="newer", from_name="Acme")
    b_out = _msg(
        user_id=user.id,
        email_thread_id=b.id,
        direction=MessageDirection.OUT,
        state=MessageState.SENT,
        from_email="me@sloopquest.test",
        from_name="Me",
        body_text="I sent this",
    )
    c_only = _msg(user_id=user.id, email_thread_id=c.id, s3_key="c-only", read_at=now, body_text="read")
    db_session.add_all([a_old, a_new, b_out, c_only])
    await db_session.flush()

    a_old.created_at = now - timedelta(minutes=10)
    a_new.created_at = now
    b_out.created_at = now - timedelta(minutes=5)
    c_only.created_at = now - timedelta(minutes=8)

    a.updated_at = now
    b.updated_at = now - timedelta(minutes=1)
    c.updated_at = now - timedelta(minutes=2)
    await db_session.flush()
    return a, b, c


async def test_list_returns_aggregates(db_session: AsyncSession, user, threads_with_messages) -> None:
    resp = await _list(db_session, user)
    assert resp.total == 3
    by_subject = {item.subject: item for item in resp.items}
    assert by_subject["A topic"].latest_from == "Acme"
    assert by_subject["A topic"].latest_snippet == "newer"
    assert by_subject["A topic"].latest_direction == MessageDirection.IN
    assert by_subject["A topic"].unread_count == 1
    assert by_subject["B topic"].latest_direction == MessageDirection.OUT
    assert by_subject["B topic"].unread_count == 0
    assert by_subject["C topic"].latest_direction == MessageDirection.IN
    assert by_subject["C topic"].unread_count == 0


async def test_has_unread_inbound_filter(db_session: AsyncSession, user, threads_with_messages) -> None:
    resp = await _list(db_session, user, filters=[BooleanFilter(column="has_unread_inbound", value=True)])
    subjects = {item.subject for item in resp.items}
    assert subjects == {"A topic"}


async def test_has_outbound_filter(db_session: AsyncSession, user, threads_with_messages) -> None:
    resp = await _list(db_session, user, filters=[BooleanFilter(column="has_outbound", value=True)])
    subjects = {item.subject for item in resp.items}
    assert subjects == {"B topic"}
