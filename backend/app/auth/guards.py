"""Auth guards — minimal stubs until full auth lands."""

from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.handlers.base import BaseRouteHandler

from app.config import config


def requires_session(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: requires an authenticated session."""
    if not connection.user:
        raise NotAuthorizedException("Authentication required")


def requires_local(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Guard: only allows requests when running in development mode."""
    if not config.IS_DEV:
        raise NotAuthorizedException("This endpoint is only available in development mode")
