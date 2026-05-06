"""Comms async tasks."""

import email as email_lib
import logging
from datetime import UTC, datetime
from email.utils import parseaddr, parsedate_to_datetime

from saq.queue import Queue
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.clients.s3 import BaseS3Client
from app.platform.comms.clients.email import BaseEmailClient, EmailPayload, EmailSendError
from app.platform.comms.enums import EmailMessageStatus
from app.platform.comms.models.emails import EmailMessage
from app.platform.comms.models.inbound_emails import InboundEmail
from app.platform.queue.registry import TaskName, task
from app.platform.queue.transactions import with_transaction
from app.platform.queue.types import AppContext

logger = logging.getLogger(__name__)


@task(TaskName.SEND_EMAIL)
@with_transaction
async def send_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    email_client: BaseEmailClient,
    email_message_id: int,
) -> None:
    """Send a queued email and update its status.

    On success: SENT + ses_message_id + sent_at.
    On failure: raises EmailSendError (CommittableTaskError) — the FAILED status
    is committed before the exception propagates so SAQ can retry.
    """
    record = await transaction.get(EmailMessage, email_message_id)
    if record is None:
        raise ValueError(f"EmailMessage {email_message_id} not found")

    payload = EmailPayload(
        to=record.to_email,
        subject=record.subject,
        body_html=record.body_html,
        body_text=record.body_text,
        from_email=record.from_email,
        from_name=record.from_name,
        reply_to=record.reply_to_email,
        in_reply_to=record.in_reply_to_message_id,
        references=record.in_reply_to_message_id,
        message_id=record.message_id,
    )

    try:
        ses_message_id = await email_client.send_email(payload)
        record.ses_message_id = ses_message_id
        record.status = EmailMessageStatus.SENT
        record.sent_at = datetime.now(UTC)
    except Exception as e:
        record.status = EmailMessageStatus.FAILED
        record.error_message = str(e)
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
    """Parse an inbound email from S3, persist a record, upload attachments, route.

    Idempotent: duplicate s3_key is silently ignored via ON CONFLICT DO NOTHING.
    """
    email_bytes = await s3_client.get_bytes(bucket, s3_key)

    msg = email_lib.message_from_bytes(email_bytes)
    from_email = parseaddr(msg.get("From", ""))[1] or None
    to_email = parseaddr(msg.get("To", ""))[1] or None
    subject = msg.get("Subject") or None
    ses_message_id = msg.get("Message-ID") or None
    in_reply_to = msg.get("In-Reply-To") or None
    raw_date = msg.get("Date")
    try:
        received_at = parsedate_to_datetime(raw_date) if raw_date else None
    except Exception:
        received_at = None

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

    stmt = (
        insert(InboundEmail)
        .values(
            s3_bucket=bucket,
            s3_key=s3_key,
            ses_message_id=ses_message_id,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            received_at=received_at,
            in_reply_to=in_reply_to,
        )
        .on_conflict_do_nothing(index_elements=["s3_key"])
        .returning(InboundEmail)
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

    # Route by recipient local-part
    to = (record.to_email or "").lower()
    if to.startswith("surveys@"):
        task_name = TaskName.HANDLE_SURVEYS_EMAIL
    elif to.startswith("support@"):
        task_name = TaskName.HANDLE_SUPPORT_EMAIL
    else:
        return {"status": "processed", "id": record.id, "routed": False}

    await queue.enqueue(str(task_name), inbound_email_id=record.id)
    return {"status": "processed", "id": record.id, "routed_to": str(task_name)}


@task(TaskName.HANDLE_SUPPORT_EMAIL)
@with_transaction
async def handle_support_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    inbound_email_id: int,
) -> dict:
    """Support email received — no automated action (human triage)."""
    logger.info("Support email received (id=%s) — no automated action", inbound_email_id)
    return {"status": "noop", "id": inbound_email_id}


@task(TaskName.HANDLE_SURVEYS_EMAIL)
@with_transaction
async def handle_surveys_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    inbound_email_id: int,
) -> dict:
    """Surveys email received — TODO: route to surveyor / survey-context resolver."""
    # TODO(SLQ): resolve sender → surveyor/customer, attach to a survey thread,
    # and trigger any auto-acknowledgement once that domain lands.
    logger.info("Surveys email received (id=%s) — handler stub, no-op", inbound_email_id)
    return {"status": "noop", "id": inbound_email_id}
