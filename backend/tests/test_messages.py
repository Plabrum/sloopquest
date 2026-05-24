"""Tests for the unified Message model — state machine, action gating, scoping."""

# pyright: reportArgumentType=false, reportPrivateUsage=false

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.inbox.actions import ResendMessage
from app.platform.actions.deps import ActionDeps
from app.platform.comms.clients.email import EmailSendError
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message
from app.platform.comms.state_machine import message_state_machine
from app.platform.comms.tasks import _find_or_create_thread, send_email_task
from app.platform.state_machine.exceptions import InvalidTransitionError
from app.platform.state_machine.machine import StateMachineService


def _make_message(**overrides) -> Message:
    defaults = dict(
        user_id=1,
        direction=MessageDirection.OUT,
        state=MessageState.QUEUED,
        subject="hi",
        from_email="me@example.com",
        to_emails=["you@example.com"],
        body_text="hello",
        body_html="<p>hello</p>",
        s3_key=None,
    )
    defaults.update(overrides)
    return Message(**defaults)


# ── State machine ────────────────────────────────────────────────────────────


async def test_sm_queued_to_sent(db_session: AsyncSession, user) -> None:
    msg = _make_message(user_id=user.id)
    db_session.add(msg)
    await db_session.flush()

    sm = StateMachineService(db_session)
    await sm.system_transition(message_state_machine, msg, MessageState.SENT)
    assert msg.state == MessageState.SENT


async def test_sm_queued_to_failed_then_back_to_queued(db_session: AsyncSession, user) -> None:
    msg = _make_message(user_id=user.id)
    db_session.add(msg)
    await db_session.flush()

    sm = StateMachineService(db_session)
    await sm.system_transition(message_state_machine, msg, MessageState.FAILED)
    assert msg.state == MessageState.FAILED

    await sm.system_transition(message_state_machine, msg, MessageState.QUEUED)
    assert msg.state == MessageState.QUEUED


async def test_sm_received_is_terminal(db_session: AsyncSession, user) -> None:
    msg = _make_message(
        user_id=user.id,
        direction=MessageDirection.IN,
        state=MessageState.RECEIVED,
        s3_key="emails/test-1",
        s3_bucket="bkt",
    )
    db_session.add(msg)
    await db_session.flush()

    sm = StateMachineService(db_session)
    with pytest.raises(InvalidTransitionError):
        await sm.system_transition(message_state_machine, msg, MessageState.SENT)


async def test_sm_sent_is_terminal(db_session: AsyncSession, user) -> None:
    msg = _make_message(user_id=user.id, state=MessageState.SENT)
    db_session.add(msg)
    await db_session.flush()

    sm = StateMachineService(db_session)
    with pytest.raises(InvalidTransitionError):
        await sm.system_transition(message_state_machine, msg, MessageState.FAILED)


# ── send_email_task ──────────────────────────────────────────────────────────


async def test_send_email_task_success_transitions_to_sent(db_session: AsyncSession, user) -> None:
    msg = _make_message(user_id=user.id)
    db_session.add(msg)
    await db_session.flush()

    email_client = MagicMock()
    email_client.send_email = AsyncMock(return_value="ses-xyz")

    await send_email_task(
        ctx={},
        transaction=db_session,
        email_client=email_client,
        message_id=msg.id,
    )

    await db_session.refresh(msg)
    assert msg.state == MessageState.SENT
    assert msg.ses_message_id == "ses-xyz"
    assert msg.sent_at is not None


async def test_send_email_task_failure_transitions_to_failed(db_session: AsyncSession, user) -> None:
    msg = _make_message(user_id=user.id)
    db_session.add(msg)
    await db_session.flush()

    email_client = MagicMock()
    email_client.send_email = AsyncMock(side_effect=RuntimeError("ses down"))

    with pytest.raises(EmailSendError):
        await send_email_task(
            ctx={},
            transaction=db_session,
            email_client=email_client,
            message_id=msg.id,
        )

    await db_session.refresh(msg)
    assert msg.state == MessageState.FAILED
    assert msg.error_message == "ses down"


# ── Thread resolution ────────────────────────────────────────────────────────


async def test_find_or_create_thread_joins_existing(db_session: AsyncSession, user) -> None:
    thread = EmailThread(user_id=user.id, subject="topic")
    db_session.add(thread)
    await db_session.flush()

    inbound = _make_message(
        user_id=user.id,
        direction=MessageDirection.IN,
        state=MessageState.RECEIVED,
        rfc_message_id="<orig@example.com>",
        email_thread_id=thread.id,
        s3_key="emails/orig",
        s3_bucket="bkt",
    )
    db_session.add(inbound)
    await db_session.flush()

    resolved = await _find_or_create_thread(
        db_session,
        user_id=user.id,
        subject="Re: topic",
        in_reply_to="<orig@example.com>",
    )
    assert resolved == thread.id


async def test_find_or_create_thread_creates_when_no_match(db_session: AsyncSession, user) -> None:
    a = await _find_or_create_thread(db_session, user_id=user.id, subject="A", in_reply_to="<a@example.com>")
    b = await _find_or_create_thread(db_session, user_id=user.id, subject="B", in_reply_to="<b@example.com>")
    assert a != b


# ── Action gating ────────────────────────────────────────────────────────────


def _action_deps(user) -> ActionDeps:
    return ActionDeps(
        user=user,
        organization=MagicMock(),
        request=MagicMock(),
        transaction=AsyncMock(),
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=MagicMock(),
        billing=MagicMock(),
        email=MagicMock(),
    )


def test_resend_message_available_only_for_failed_outbound(user) -> None:
    failed_out = _make_message(user_id=user.id, direction=MessageDirection.OUT, state=MessageState.FAILED)
    assert ResendMessage.is_available(failed_out, _action_deps(user)) is True

    sent_out = _make_message(user_id=user.id, direction=MessageDirection.OUT, state=MessageState.SENT)
    assert ResendMessage.is_available(sent_out, _action_deps(user)) is False

    received_in = _make_message(user_id=user.id, direction=MessageDirection.IN, state=MessageState.RECEIVED)
    assert ResendMessage.is_available(received_in, _action_deps(user)) is False
