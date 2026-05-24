"""Tests for inbox local-part claiming and inbound email routing.

Covers normalization, availability, claim, and the routing branches in
process_inbound_email_task (reserved / user / bounce / drop).
"""

# pyright: reportArgumentType=false, reportPrivateUsage=false

from __future__ import annotations

from email.message import Message
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.actions import ClaimInbox, ClaimInboxData
from app.domain.users.models import User
from app.domain.users.service import (
    InboxAlreadyClaimedError,
    InboxLocalPartError,
    InboxLocalPartTakenError,
    UserService,
)
from app.platform.actions.deps import ActionDeps
from app.platform.comms.constants import (
    RESERVED_INBOX_LOCAL_PARTS,
    is_valid_local_part_shape,
    normalize_local_part,
)
from app.platform.comms.tasks import _parse_auth_verdicts, process_inbound_email_task
from app.platform.queue.enums import TaskName
from tests.factories.users import UserFactory

# ── normalize_local_part ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("phil", "phil"),
        ("Phil", "phil"),
        ("  phil  ", "phil"),
        ("Phil.Labrum", "phillabrum"),
        ("PHIL.LABRUM", "phillabrum"),
        ("a.b.c", "abc"),
    ],
)
def test_normalize_local_part(raw: str, expected: str) -> None:
    assert normalize_local_part(raw) == expected


@pytest.mark.parametrize(
    ("value", "ok"),
    [
        ("phil", True),
        ("ph", False),  # too short
        ("a" * 33, False),  # too long
        ("phil-l", True),
        ("-phil", False),  # leading hyphen
        ("phil-", False),  # trailing hyphen
        ("phil_l", False),  # underscore not allowed
        ("Phil", False),  # uppercase rejected — caller must normalize first
        ("ph!l", False),
    ],
)
def test_is_valid_local_part_shape(value: str, ok: bool) -> None:
    assert is_valid_local_part_shape(value) is ok


def test_reserved_set_includes_routed_aliases() -> None:
    # Critical routing assumption: tasks.py special-cases these strings, and
    # the routes/service code rejects them via this set. Lock the contract.
    assert "surveys" in RESERVED_INBOX_LOCAL_PARTS
    assert "support" in RESERVED_INBOX_LOCAL_PARTS
    assert "mailer-daemon" in RESERVED_INBOX_LOCAL_PARTS


# ── _parse_auth_verdicts ──────────────────────────────────────────────────────


def _build_msg(headers: dict[str, str]) -> Message:
    msg = Message()
    for k, v in headers.items():
        msg[k] = v
    return msg


def test_parse_auth_verdicts_pass() -> None:
    msg = _build_msg(
        {
            "From": "sender@gmail.com",
            "Authentication-Results": "amazonses.com; spf=pass; dkim=pass; dmarc=pass",
        }
    )
    spf, dkim, automated = _parse_auth_verdicts(msg)
    assert (spf, dkim, automated) == (True, True, False)


def test_parse_auth_verdicts_spf_fail() -> None:
    msg = _build_msg(
        {
            "From": "sender@gmail.com",
            "Authentication-Results": "amazonses.com; spf=fail; dkim=pass",
        }
    )
    spf, dkim, _ = _parse_auth_verdicts(msg)
    assert spf is False
    assert dkim is True


def test_parse_auth_verdicts_automated_mailer_daemon() -> None:
    msg = _build_msg(
        {
            "From": "MAILER-DAEMON@aol.com",
            "Authentication-Results": "amazonses.com; spf=pass; dkim=pass",
        }
    )
    _, _, automated = _parse_auth_verdicts(msg)
    assert automated is True


def test_parse_auth_verdicts_automated_auto_submitted() -> None:
    msg = _build_msg(
        {
            "From": "vacation@example.com",
            "Auto-Submitted": "auto-replied",
        }
    )
    _, _, automated = _parse_auth_verdicts(msg)
    assert automated is True


def test_parse_auth_verdicts_automated_empty_envelope() -> None:
    msg = _build_msg({"Subject": "no from"})
    _, _, automated = _parse_auth_verdicts(msg)
    assert automated is True


# ── UserService — inbox availability + claim ──────────────────────────────────


@pytest.fixture
async def other_user(db_session: AsyncSession, org):
    instance = await UserFactory.create_async(session=db_session, organization_id=org.id)
    instance.inbox_local_part = "taken"
    await db_session.flush()
    return instance


async def test_is_inbox_local_part_available_invalid(db_session: AsyncSession) -> None:
    svc = UserService(db_session)
    available, _, reason = await svc.is_inbox_local_part_available("ab")
    assert available is False
    assert reason == "invalid"


async def test_is_inbox_local_part_available_reserved(db_session: AsyncSession) -> None:
    svc = UserService(db_session)
    available, canonical, reason = await svc.is_inbox_local_part_available("Admin")
    assert available is False
    assert canonical == "admin"
    assert reason == "reserved"


async def test_is_inbox_local_part_available_taken(db_session: AsyncSession, other_user) -> None:
    svc = UserService(db_session)
    available, _, reason = await svc.is_inbox_local_part_available("taken")
    assert available is False
    assert reason == "taken"


async def test_is_inbox_local_part_available_open(db_session: AsyncSession) -> None:
    svc = UserService(db_session)
    available, canonical, reason = await svc.is_inbox_local_part_available("Phil.Labrum")
    assert available is True
    assert canonical == "phillabrum"
    assert reason is None


async def test_claim_inbox_local_part_success(db_session: AsyncSession, user) -> None:
    svc = UserService(db_session)
    canonical = await svc.claim_inbox_local_part(int(user.id), "Phil")
    assert canonical == "phil"
    refreshed = await db_session.get(User, int(user.id))
    assert refreshed is not None and refreshed.inbox_local_part == "phil"


async def test_claim_inbox_local_part_already_set_raises(db_session: AsyncSession, user) -> None:
    user.inbox_local_part = "phil"
    await db_session.flush()
    svc = UserService(db_session)
    with pytest.raises(InboxAlreadyClaimedError):
        await svc.claim_inbox_local_part(int(user.id), "phil2")


async def test_claim_inbox_local_part_taken_raises(db_session: AsyncSession, user, other_user) -> None:
    svc = UserService(db_session)
    with pytest.raises(InboxLocalPartTakenError):
        await svc.claim_inbox_local_part(int(user.id), "taken")


async def test_claim_inbox_local_part_reserved_raises(db_session: AsyncSession, user) -> None:
    svc = UserService(db_session)
    with pytest.raises(InboxLocalPartError):
        await svc.claim_inbox_local_part(int(user.id), "Admin")


async def test_claim_inbox_local_part_invalid_raises(db_session: AsyncSession, user) -> None:
    svc = UserService(db_session)
    with pytest.raises(InboxLocalPartError):
        await svc.claim_inbox_local_part(int(user.id), "ab")


# ── process_inbound_email_task — routing branches ─────────────────────────────


def _mime_bytes(
    *,
    to: str,
    sender: str = "sender@gmail.com",
    subject: str = "hello",
    auth_results: str = "amazonses.com; spf=pass; dkim=pass; dmarc=pass",
    auto_submitted: str | None = None,
) -> bytes:
    headers = [
        f"From: {sender}",
        f"To: {to}",
        f"Subject: {subject}",
        "Message-ID: <test@example.com>",
        "Date: Mon, 11 May 2026 12:00:00 +0000",
        f"Authentication-Results: {auth_results}",
        "Content-Type: text/plain; charset=utf-8",
    ]
    if auto_submitted:
        headers.append(f"Auto-Submitted: {auto_submitted}")
    body = "test body"
    return ("\r\n".join(headers) + "\r\n\r\n" + body).encode("utf-8")


def _make_s3_client(payload: bytes) -> MagicMock:
    s3 = MagicMock()
    s3.get_bytes = AsyncMock(return_value=payload)
    s3.put_bytes = AsyncMock()
    return s3


def _make_queue() -> MagicMock:
    q = MagicMock()
    q.enqueue = AsyncMock()
    return q


async def test_process_inbound_routes_reserved_surveys(
    db_session: AsyncSession,
) -> None:
    s3 = _make_s3_client(_mime_bytes(to="surveys@sloopquest.com"))
    queue = _make_queue()

    result = await process_inbound_email_task(
        ctx={},
        transaction=db_session,
        s3_client=s3,
        queue=queue,
        bucket="bkt",
        s3_key="emails/surveys-1",
    )

    assert result["routed"] == "reserved_surveys"
    queue.enqueue.assert_awaited_once()
    assert queue.enqueue.await_args.args[0] == str(TaskName.HANDLE_SURVEYS_EMAIL)


async def test_process_inbound_routes_to_user_inbox(db_session: AsyncSession, user) -> None:
    user.inbox_local_part = "phil"
    await db_session.flush()

    s3 = _make_s3_client(_mime_bytes(to="phil@sloopquest.com"))
    queue = _make_queue()

    result = await process_inbound_email_task(
        ctx={},
        transaction=db_session,
        s3_client=s3,
        queue=queue,
        bucket="bkt",
        s3_key="emails/phil-1",
    )

    assert result["routed"] == "user"
    # User inbox no longer enqueues a follow-up task — the inbound row is
    # written inline by process_inbound_email_task and is immediately visible.
    queue.enqueue.assert_not_awaited()


async def test_process_inbound_bounces_unknown_when_authenticated(
    db_session: AsyncSession,
) -> None:
    s3 = _make_s3_client(_mime_bytes(to="nobody@sloopquest.com"))
    queue = _make_queue()

    result = await process_inbound_email_task(
        ctx={},
        transaction=db_session,
        s3_client=s3,
        queue=queue,
        bucket="bkt",
        s3_key="emails/nobody-1",
    )

    assert result["routed"] == "bounced"
    queue.enqueue.assert_awaited_once()
    assert queue.enqueue.await_args.args[0] == str(TaskName.SEND_UNKNOWN_RECIPIENT_BOUNCE)


async def test_process_inbound_drops_unknown_when_spf_fails(
    db_session: AsyncSession,
) -> None:
    s3 = _make_s3_client(
        _mime_bytes(
            to="nobody@sloopquest.com",
            auth_results="amazonses.com; spf=fail; dkim=fail",
        )
    )
    queue = _make_queue()

    result = await process_inbound_email_task(
        ctx={},
        transaction=db_session,
        s3_client=s3,
        queue=queue,
        bucket="bkt",
        s3_key="emails/spoofed-1",
    )

    assert result["routed"] == "dropped"
    queue.enqueue.assert_not_awaited()


async def test_process_inbound_drops_unknown_when_automated(
    db_session: AsyncSession,
) -> None:
    s3 = _make_s3_client(_mime_bytes(to="nobody@sloopquest.com", auto_submitted="auto-replied"))
    queue = _make_queue()

    result = await process_inbound_email_task(
        ctx={},
        transaction=db_session,
        s3_client=s3,
        queue=queue,
        bucket="bkt",
        s3_key="emails/autoreply-1",
    )

    assert result["routed"] == "dropped"
    queue.enqueue.assert_not_awaited()


# ── ClaimInbox action — gating ────────────────────────────────────────────────


def _action_deps_for(current_user: User) -> ActionDeps:
    return ActionDeps(
        user=current_user,
        organization=MagicMock(),
        request=MagicMock(),
        transaction=AsyncMock(),
        config=MagicMock(),
        task_queues=MagicMock(),
        sm_service=MagicMock(),
        billing=MagicMock(),
        email=MagicMock(),
    )


def test_claim_inbox_available_when_unclaimed_and_self(user) -> None:
    user.inbox_local_part = None
    assert ClaimInbox.is_available(user, _action_deps_for(user)) is True


def test_claim_inbox_unavailable_when_already_claimed(user) -> None:
    user.inbox_local_part = "phil"
    assert ClaimInbox.is_available(user, _action_deps_for(user)) is False


def test_claim_inbox_unavailable_for_other_user(user, org) -> None:
    user.inbox_local_part = None
    other = User(name="other", email="o@example.test", organization_id=org.id)
    other.id = user.id + 1  # type: ignore[assignment]
    # Caller is `other` trying to claim on `user`'s row — must be blocked.
    assert ClaimInbox.is_available(user, _action_deps_for(other)) is False


async def test_claim_inbox_execute_persists_local_part(db_session: AsyncSession, user) -> None:
    response = await ClaimInbox.execute(user, ClaimInboxData(local_part="Phil"), db_session, _action_deps_for(user))
    assert "phil@" in response.message
    refreshed = await db_session.get(User, int(user.id))
    assert refreshed is not None and refreshed.inbox_local_part == "phil"
