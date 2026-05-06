"""Auth guards."""

from litestar import Request
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException, PermissionDeniedException
from litestar.handlers.base import BaseRouteHandler

from app.config import config
from app.domain.users.roles import Role
from app.platform.auth.crypto import verify_payload_signature


def requires_session(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: requires an authenticated session."""
    if not connection.user:
        raise NotAuthorizedException("Authentication required")


def requires_role(allowed_roles: list[Role], connection: ASGIConnection) -> None:
    """Guard helper: requires the user to hold one of the given roles.

    Not a Litestar guard directly — call from inside a route-specific guard wrapper.
    """
    if not connection.user:
        raise NotAuthorizedException("Authentication required")
    if connection.user.role_enum not in allowed_roles:
        raise PermissionDeniedException(f"Requires one of: {', '.join(allowed_roles)}")


def requires_local(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: only allows requests when running in development or test mode."""
    if not config.IS_DEV and config.ENV != "testing":
        raise NotAuthorizedException("This endpoint is only available in development mode")


async def requires_webhook_signature(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: verifies HMAC-SHA256 webhook signature in X-Webhook-Signature header."""
    signature = connection.headers.get("X-Webhook-Signature")
    if not signature:
        raise NotAuthorizedException("Missing X-Webhook-Signature header")
    body = await Request(connection.scope, connection.receive, connection.send).body()
    if not verify_payload_signature(body, signature, config.WEBHOOK_SECRET):
        raise NotAuthorizedException("Invalid webhook signature")
