"""Comms async tasks."""

import email as email_lib
import logging
from datetime import UTC, datetime
from email.message import Message as MimeMessage
from email.utils import parseaddr, parsedate_to_datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape
from saq.queue import Queue
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.users.models import User
from app.platform.clients.s3 import BaseS3Client
from app.platform.comms.clients.email import BaseEmailClient, EmailPayload, EmailSendError
from app.platform.comms.constants import RESERVED_INBOX_LOCAL_PARTS, normalize_local_part
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message
from app.platform.comms.state_machine import message_state_machine
from app.platform.queue.registry import TaskName, task
from app.platform.queue.transactions import with_transaction
from app.platform.queue.types import AppContext
from app.platform.state_machine.machine import StateMachineService

logger = logging.getLogger(__name__)


def _parse_auth_verdicts(msg: MimeMessage) -> tuple[bool, bool, bool]:
    """Extract (spf_pass, dkim_pass, is_automated) from an inbound MIME message.

    SES inserts an Authentication-Results header with `spf=pass`/`dkim=pass`
    tokens. is_automated catches bounce/auto-reply traffic that we must never
    answer with a bounce of our own (RFC 3834, backscatter prevention).
    """
    auth_header = (msg.get("Authentication-Results") or "").lower()
    spf_pass = "spf=pass" in auth_header
    dkim_pass = "dkim=pass" in auth_header

    from_header = (msg.get("From") or "").lower()
    is_automated = (
        not from_header
        or "mailer-daemon" in from_header
        or "<>" in from_header
        or msg.get("Auto-Submitted") is not None
    )
    return spf_pass, dkim_pass, is_automated


async def _find_or_create_thread(
    transaction: AsyncSession,
    *,
    user_id: int,
    subject: str | None,
    in_reply_to: str | None,
) -> int:
    """Resolve a thread for an inbound message — by In-Reply-To first, else create."""
    if in_reply_to:
        existing = await transaction.scalar(
            select(EmailThread.id)
            .join(Message, Message.email_thread_id == EmailThread.id)
            .where(EmailThread.user_id == user_id, Message.rfc_message_id == in_reply_to)
            .limit(1)
        )
        if existing is not None:
            return existing
    thread = EmailThread(user_id=user_id, subject=subject)
    transaction.add(thread)
    await transaction.flush()
    return thread.id


@task(TaskName.SEND_EMAIL)
@with_transaction
async def send_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    email_client: BaseEmailClient,
    message_id: int,
) -> None:
    """Send a queued outbound message and transition it to SENT/FAILED."""
    record = await transaction.get(Message, message_id)
    if record is None:
        raise ValueError(f"Message {message_id} not found")

    payload = EmailPayload(
        to=record.to_emails,
        subject=record.subject or "",
        body_html=record.body_html or "",
        body_text=record.body_text or "",
        from_email=record.from_email or "",
        from_name=record.from_name,
        reply_to=record.reply_to_email,
        in_reply_to=record.in_reply_to,
        references=record.in_reply_to,
        message_id=record.rfc_message_id,
    )

    sm_service = StateMachineService(transaction)
    try:
        ses_id = await email_client.send_email(payload)
        record.ses_message_id = ses_id
        record.sent_at = datetime.now(UTC)
        await sm_service.system_transition(message_state_machine, record, MessageState.SENT)
    except Exception as e:
        record.error_message = str(e)
        await sm_service.system_transition(message_state_machine, record, MessageState.FAILED)
        raise EmailSendError(str(e)) from e


@task(TaskName.PROCESS_INBOUND_EMAIL)
@with_transaction
async def process_inbound_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    queue: Queue,
    bucket: str,
    s3_key: str,
) -> dict:
    """Parse an inbound email from S3, persist a Message row, upload attachments, route.

    Idempotent: duplicate s3_key is silently ignored via ON CONFLICT DO NOTHING.
    """
    email_bytes = await s3_client.get_bytes(bucket, s3_key)

    msg = email_lib.message_from_bytes(email_bytes)
    from_email = parseaddr(msg.get("From", ""))[1] or None
    to_email = (parseaddr(msg.get("To", ""))[1] or "").lower()
    subject = msg.get("Subject") or None
    rfc_message_id = msg.get("Message-ID") or None
    in_reply_to = msg.get("In-Reply-To") or None
    raw_date = msg.get("Date")
    try:
        received_at = parsedate_to_datetime(raw_date) if raw_date else None
    except Exception:
        received_at = None

    spf_pass, dkim_pass, is_automated = _parse_auth_verdicts(msg)

    attachments_meta: list[dict] = []
    body_text: str | None = None
    body_html: str | None = None
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        content_disposition = part.get("Content-Disposition") or ""
        ct = part.get_content_type()
        payload = part.get_payload(decode=True)

        if "attachment" in content_disposition:
            filename = part.get_filename()
            if filename:
                attachments_meta.append(
                    {
                        "filename": filename,
                        "content_type": ct,
                        "size": len(payload or b""),
                        "s3_key": None,
                    }
                )
        else:
            if isinstance(payload, bytes):
                charset = part.get_content_charset() or "utf-8"
                if ct == "text/plain" and body_text is None:
                    body_text = payload.decode(charset, errors="replace")
                elif ct == "text/html" and body_html is None:
                    body_html = payload.decode(charset, errors="replace")

    local_part = normalize_local_part(to_email.split("@", 1)[0]) if "@" in to_email else ""

    # Resolve the recipient user before creating the Message row — Message.user_id
    # is NOT NULL, so reserved/unknown branches need a fallback (or a separate path).
    user_id: int | None = None
    routed: str
    if local_part == "surveys":
        routed = "reserved_surveys"
    elif local_part == "support":
        routed = "reserved_support"
    elif local_part in RESERVED_INBOX_LOCAL_PARTS:
        routed = "reserved_dropped"
    else:
        resolved = await transaction.scalar(select(User.id).where(User.inbox_local_part == local_part))
        if resolved is not None:
            user_id = int(resolved)
            routed = "user"
        elif spf_pass and dkim_pass and not is_automated:
            routed = "bounced"
        else:
            routed = "dropped"

    if user_id is None:
        # Reserved / bounced / dropped paths: no user-scoped Message row to write.
        # The bounce task creates its own outbound row when needed.
        if routed == "reserved_surveys":
            await queue.enqueue(str(TaskName.HANDLE_SURVEYS_EMAIL), bucket=bucket, s3_key=s3_key)
            # Run the document-extraction import flow alongside the legacy stub.
            # The new task is gated internally by SURVEY_IMPORT_ENABLED.
            await queue.enqueue(str(TaskName.IMPORT_SURVEYS_FROM_EMAIL), bucket=bucket, s3_key=s3_key)
        elif routed == "reserved_support":
            await queue.enqueue(str(TaskName.HANDLE_SUPPORT_EMAIL), bucket=bucket, s3_key=s3_key)
        elif routed == "bounced":
            await queue.enqueue(
                str(TaskName.SEND_UNKNOWN_RECIPIENT_BOUNCE),
                from_email=from_email,
                to_email=to_email,
                subject=subject,
            )
        return {"status": "processed", "routed": routed}

    thread_id = await _find_or_create_thread(
        transaction,
        user_id=user_id,
        subject=subject,
        in_reply_to=in_reply_to,
    )

    stmt = (
        insert(Message)
        .values(
            user_id=user_id,
            email_thread_id=thread_id,
            direction=MessageDirection.IN.name,
            state=MessageState.RECEIVED.name,
            subject=subject,
            from_email=from_email,
            to_emails=[to_email] if to_email else [],
            rfc_message_id=rfc_message_id,
            in_reply_to=in_reply_to,
            s3_bucket=bucket,
            s3_key=s3_key,
            received_at=received_at,
            spf_pass=spf_pass,
            dkim_pass=dkim_pass,
            is_automated=is_automated,
        )
        .on_conflict_do_nothing(index_elements=["s3_key"])
        .returning(Message)
    )
    result = await transaction.execute(stmt)
    record = result.scalar_one_or_none()
    if record is None:
        return {"status": "duplicate", "s3_key": s3_key}

    upload_base = f"emails/attachments/{record.id}"
    for i, (part, meta) in enumerate(
        zip(
            [
                p
                for p in msg.walk()
                if p.get_content_maintype() != "multipart"
                and "attachment" in (p.get("Content-Disposition") or "")
                and p.get_filename()
            ],
            attachments_meta,
        )
    ):
        attachment_data: bytes = part.get_payload(decode=True) or b""  # type: ignore[assignment]
        att_key = f"{upload_base}/{i}_{meta['filename']}"
        await s3_client.put_bytes(bucket, att_key, attachment_data, meta["content_type"])
        meta["s3_key"] = att_key

    record.body_text = body_text
    record.body_html = body_html
    record.attachments_json = {"attachments": attachments_meta}
    record.processed_at = datetime.now(UTC)

    return {"status": "processed", "id": record.id, "routed": "user"}


@task(TaskName.HANDLE_SUPPORT_EMAIL)
@with_transaction
async def handle_support_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    bucket: str,
    s3_key: str,
) -> dict:
    """Support email received — no automated action (human triage)."""
    logger.info("Support email received (s3_key=%s) — no automated action", s3_key)
    return {"status": "noop", "s3_key": s3_key}


@task(TaskName.HANDLE_SURVEYS_EMAIL)
@with_transaction
async def handle_surveys_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    bucket: str,
    s3_key: str,
) -> dict:
    """Surveys email received — TODO: route to surveyor / survey-context resolver."""
    # TODO(SLQ): resolve sender → surveyor/customer, attach to a survey thread,
    # and trigger any auto-acknowledgement once that domain lands.
    logger.info("Surveys email received (s3_key=%s) — handler stub, no-op", s3_key)
    return {"status": "noop", "s3_key": s3_key}


@task(TaskName.SEND_UNKNOWN_RECIPIENT_BOUNCE)
@with_transaction
async def send_unknown_recipient_bounce_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    email_client: BaseEmailClient,
    from_email: str | None,
    to_email: str,
    subject: str | None,
) -> dict:
    """Send an RFC-style mailer-daemon bounce for an unrouteable inbound.

    Sent directly via the email client — we don't persist a Message row because
    bounces have no owning user (Message.user_id is NOT NULL) and the audit
    value of a per-bounce row is low compared to the cost of a synthetic owner.
    """
    if not from_email:
        return {"status": "skipped", "reason": "missing_from"}

    bounce_from = f"mailer-daemon@{config.INBOX_DOMAIN}"

    html_body, text_body = _render_bounce_template(
        original_to=to_email,
        original_subject=subject or "",
    )

    payload = EmailPayload(
        to=[from_email],
        subject=f"Delivery failure: {to_email}",
        body_html=html_body,
        body_text=text_body,
        from_email=bounce_from,
        from_name="Mail Delivery System",
    )
    try:
        await email_client.send_email(payload)
    except Exception as e:
        raise EmailSendError(str(e)) from e
    return {"status": "sent", "to": from_email}


def _render_bounce_template(*, original_to: str, original_subject: str) -> tuple[str, str]:
    env = Environment(
        loader=FileSystemLoader(config.EMAIL_TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "jinja2"]),
    )
    ctx = {"original_to": original_to, "original_subject": original_subject}
    html = env.get_template("unknown_recipient_bounce/html.jinja2").render(**ctx)
    text = env.get_template("unknown_recipient_bounce/text.jinja2").render(**ctx)
    return html, text
