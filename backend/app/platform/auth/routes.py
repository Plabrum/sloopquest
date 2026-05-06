import logging
import time
from dataclasses import dataclass

from litestar import Request, Router, get, post
from litestar.exceptions import PermissionDeniedException
from litestar.middleware.rate_limit import RateLimitConfig

from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.auth.service import AuthService

logger = logging.getLogger(__name__)

_rate_limit = RateLimitConfig(rate_limit=("minute", 3))


@dataclass
class MagicLinkRequestBody:
    email: str


@dataclass
class MeResponse:
    id: int
    name: str
    email: str
    email_verified: bool
    role: str


@post("/magic-link/request", tags=["auth"], middleware=[_rate_limit.middleware])
async def request_magic_link(
    data: MagicLinkRequestBody,
    auth_service: AuthService,
) -> dict[str, str]:
    """Request a magic link for the given email. Always returns success."""
    try:
        await auth_service.request_magic_link(data.email)
    except Exception:
        logger.exception("Failed to send magic link to %s", data.email)
    return {"message": "If that email exists, a magic link has been sent."}


@get("/magic-link/verify", tags=["auth"])
async def verify_magic_link(
    token: str,
    request: Request,
    auth_service: AuthService,
) -> dict[str, str]:
    """Verify a magic link token and set session."""
    existing_user_id = request.session.get("user_id")
    user = await auth_service.verify_magic_link(token)

    if user is not None:
        request.set_session({"user_id": int(user.id), "last_activity": time.time()})
        return {"message": "Authenticated"}
    if existing_user_id is not None:
        return {"message": "Already authenticated"}

    raise PermissionDeniedException("Invalid or expired magic link.")


@post("/logout", tags=["auth"])
async def logout(request: Request) -> dict[str, str]:
    """Clear the current session."""
    request.clear_session()
    return {"message": "Logged out"}


@get("/me", guards=[requires_session], tags=["auth"])
async def me(user: User) -> MeResponse:
    return MeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
        role=user.role,
    )


auth_router = Router(
    path="/auth",
    route_handlers=[request_magic_link, verify_magic_link, logout, me],
    tags=["auth"],
)
