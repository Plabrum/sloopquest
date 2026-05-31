"""SAQ tasks driving the surveys@ inbox → SurveyExtractor pipeline.

Two tasks compose the flow:
  - `import_surveys_from_email_task` (SYSTEM role): parses the raw inbound
    email from S3, resolves the sender to a User, uploads each PDF
    attachment to `S3_DOCUMENTS_BUCKET`, then fans out one
    `IMPORT_SURVEY_FROM_PDF` per attachment so each PDF retries independently.
  - `import_survey_from_pdf_task` (USER role): downloads one PDF, runs
    `SurveyExtractor().extract`, and sends a success or failure reply.

The dispatch from the inbound router runs *alongside* the existing
`HANDLE_SURVEYS_EMAIL` no-op stub — both are gated independently. The
existing path stays untouched until we choose to retire it.
"""

from __future__ import annotations

import email as email_lib
import logging
from email.message import Message
from email.utils import parseaddr
from uuid import uuid4

from saq.queue import Queue
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.surveys.import_replies import (
    send_extraction_failure_reply,
    send_survey_imported_reply,
)
from app.domain.surveys.models import Survey
from app.domain.surveys.survey_extractor import SurveyExtractor
from app.domain.users.models import User
from app.platform.clients.s3 import BaseS3Client
from app.platform.comms.clients.email import BaseEmailClient
from app.platform.extraction.types import Document, ExtractionError
from app.platform.queue.enums import TaskName, TaskRoleType
from app.platform.queue.registry import task
from app.platform.queue.transactions import with_transaction
from app.platform.queue.types import AppContext

logger = logging.getLogger(__name__)

# Task-framing prompt. Schemas carry the per-field guidance (`Annotated[..., Meta(description=...)]`);
# this string just sets the document context for the model.
_SURVEY_IMPORT_PROMPT = (
    "This document is a completed marine survey for a vessel — typically a "
    "PDF written by a marine surveyor. Extract the structured data described "
    "by the schema, populating every field for which the document provides a "
    "value. Leave optional fields null when the document is silent. Do not "
    "invent or interpolate values."
)


@task(TaskName.IMPORT_SURVEYS_FROM_EMAIL)
@with_transaction
async def import_surveys_from_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    queue: Queue,
    bucket: str,
    s3_key: str,
) -> dict:
    """Fan-out router: one inbound surveys@ email → N per-PDF import tasks."""
    if not config.SURVEY_IMPORT_ENABLED:
        logger.info(f"SURVEY_IMPORT_ENABLED=false; skipping email s3_key={s3_key}")
        return {"status": "skipped_disabled"}

    raw = await s3_client.get_bytes(bucket, s3_key)
    msg = email_lib.message_from_bytes(raw)
    from_email = (parseaddr(msg.get("From", ""))[1] or "").lower() or None

    if from_email is None:
        logger.warning(f"surveys@ import: no From address (s3_key={s3_key})")
        return {"status": "skipped_no_sender"}

    user_id = await transaction.scalar(select(User.id).where(User.email == from_email))
    if user_id is None:
        logger.info(f"surveys@ import: sender {from_email} is not a known user (s3_key={s3_key})")
        return {"status": "skipped_unknown_sender", "from_email": from_email}

    pdf_attachments = _extract_pdf_attachments(msg)
    if not pdf_attachments:
        logger.info(f"surveys@ import: no PDF attachments (s3_key={s3_key})")
        return {"status": "skipped_no_pdfs"}

    dispatched: list[str] = []
    for idx, (filename, data) in enumerate(pdf_attachments):
        pdf_key = f"surveys/import/{uuid4()}/{filename}"
        await s3_client.put_bytes(config.S3_DOCUMENTS_BUCKET, pdf_key, data, "application/pdf")
        await queue.enqueue(
            str(TaskName.IMPORT_SURVEY_FROM_PDF),
            user_id=int(user_id),
            pdf_bucket=config.S3_DOCUMENTS_BUCKET,
            pdf_s3_key=pdf_key,
            filename=filename,
            reply_to=from_email,
            source_email_s3_key=s3_key,
            attachment_index=idx,
        )
        dispatched.append(pdf_key)

    return {"status": "dispatched", "count": len(dispatched), "from_email": from_email}


@task(TaskName.IMPORT_SURVEY_FROM_PDF)
@with_transaction(role_type=TaskRoleType.USER)
async def import_survey_from_pdf_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    email_client: BaseEmailClient,
    user_id: int,  # noqa: ARG001 — consumed by @with_transaction for RLS context
    pdf_bucket: str,
    pdf_s3_key: str,
    filename: str,
    reply_to: str,
    source_email_s3_key: str,
    attachment_index: int,
) -> dict:
    """Single-PDF extraction. Runs in the sender's RLS context."""
    pdf_bytes = await s3_client.get_bytes(pdf_bucket, pdf_s3_key)
    document = Document.from_pdf(pdf_bytes)

    try:
        survey: Survey = await SurveyExtractor.extract(transaction, document, prompt=_SURVEY_IMPORT_PROMPT)
    except ExtractionError as exc:
        logger.exception(f"Survey extraction failed for {filename} (s3_key={pdf_s3_key})")
        await send_extraction_failure_reply(
            email_client,
            to_email=reply_to,
            filename=filename,
            reason=str(exc),
        )
        return {"status": "failed", "filename": filename, "reason": str(exc)}

    # Stamp ingress provenance — the extractor doesn't see attachment metadata.
    survey.source_attachment_index = attachment_index
    await transaction.flush()

    await send_survey_imported_reply(
        email_client,
        to_email=reply_to,
        filename=filename,
        survey_id=int(survey.id),
    )
    return {
        "status": "imported",
        "filename": filename,
        "survey_id": int(survey.id),
        "source_email_s3_key": source_email_s3_key,
    }


def _extract_pdf_attachments(msg: Message) -> list[tuple[str, bytes]]:
    """Return `(filename, bytes)` for every PDF attachment in `msg`."""
    out: list[tuple[str, bytes]] = []
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        if "attachment" not in (part.get("Content-Disposition") or ""):
            continue
        filename = part.get_filename()
        if not filename:
            continue
        ct = (part.get_content_type() or "").lower()
        if ct != "application/pdf" and not filename.lower().endswith(".pdf"):
            continue
        payload = part.get_payload(decode=True) or b""
        if isinstance(payload, bytes) and payload:
            out.append((filename, payload))
    return out
