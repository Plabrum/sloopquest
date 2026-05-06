"""Comms webhook routes — receives events from external systems."""

import msgspec
from litestar import Request, Router, post

from app.platform.auth.guards import requires_webhook_signature
from app.platform.queue.enums import TaskName


class InboundEmailWebhookPayload(msgspec.Struct):
    bucket: str
    s3_key: str


@post("/webhooks/comms/email/inbound", guards=[requires_webhook_signature], exclude_from_auth=True)
async def handle_inbound_email(
    data: InboundEmailWebhookPayload,
    request: Request,
) -> dict[str, str]:
    """Receive an inbound-email notification from the S3→Lambda pipeline.

    Verifies HMAC signature, enqueues PROCESS_INBOUND_EMAIL task, returns immediately.
    """
    await request.app.state.task_queues.get("default").enqueue(
        TaskName.PROCESS_INBOUND_EMAIL,
        bucket=data.bucket,
        s3_key=data.s3_key,
    )
    return {"status": "queued"}


comms_webhook_router = Router(path="/", route_handlers=[handle_inbound_email])
