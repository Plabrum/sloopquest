"""Auto-replies for the surveys@ import pipeline.

Placeholder copy — both bodies are stubs and will be replaced with proper
templates once email_templates/ for the import flow ship. Tracked in the
spec's open questions.
"""

from __future__ import annotations

from app.config import config
from app.platform.comms.clients.email import BaseEmailClient, EmailPayload


async def send_survey_imported_reply(
    email_client: BaseEmailClient,
    *,
    to_email: str,
    filename: str,
    survey_id: int,
) -> None:
    subject = f"Imported: {filename}"
    body_text = (
        f"We've imported the survey from {filename} into your Sloopquest workspace.\n\n"
        f"Open it in the app to review the auto-filled fields before finalizing.\n\n"
        f"(Reference: survey #{survey_id})"
    )
    body_html = f"<p>{body_text.replace(chr(10), '<br/>')}</p>"
    await email_client.send_email(
        EmailPayload(
            to=[to_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            from_email=config.SES_FROM_EMAIL,
            from_name=config.SES_FROM_NAME,
        )
    )


async def send_extraction_failure_reply(
    email_client: BaseEmailClient,
    *,
    to_email: str,
    filename: str,
    reason: str,
) -> None:
    subject = f"Couldn't import: {filename}"
    body_text = (
        f"We weren't able to read the survey from {filename}.\n\n"
        f"You can try forwarding again, or open Sloopquest to enter it manually.\n\n"
        f"(Details: {reason})"
    )
    body_html = f"<p>{body_text.replace(chr(10), '<br/>')}</p>"
    await email_client.send_email(
        EmailPayload(
            to=[to_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            from_email=config.SES_FROM_EMAIL,
            from_name=config.SES_FROM_NAME,
        )
    )
