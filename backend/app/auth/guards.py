"""Auth guards — minimal stubs until full auth lands."""

from litestar import Request
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.handlers.base import BaseRouteHandler

from app.auth.crypto import verify_payload_signature
from app.config import config


def requires_session(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: requires an authenticated session."""
    if not connection.user:
        raise NotAuthorizedException("Authentication required")


def requires_local(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: only allows requests when running in development mode."""
    if not config.IS_DEV:
        raise NotAuthorizedException("This endpoint is only available in development mode")


async def requires_webhook_signature(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: verifies HMAC-SHA256 webhook signature in X-Webhook-Signature header."""
    signature = connection.headers.get("X-Webhook-Signature")
    if not signature:
        raise NotAuthorizedException("Missing X-Webhook-Signature header")
    body = await Request(connection.scope, connection.receive, connection.send).body()
    if not verify_payload_signature(body, signature, config.WEBHOOK_SECRET):
        raise NotAuthorizedException("Invalid webhook signature")
