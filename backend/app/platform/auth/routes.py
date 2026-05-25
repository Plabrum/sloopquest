import logging
from dataclasses import dataclass

from litestar import Request, Router, get, post
from litestar.exceptions import PermissionDeniedException
from litestar.middleware.rate_limit import RateLimitConfig
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.domain.onboarding.models import Onboarding
from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.auth.service import AuthService

logger = logging.getLogger(__name__)

_rate_limit = RateLimitConfig(rate_limit=("minute", 3))

_DEMO_ORG_ID = 0
_DEMO_EMAIL_DOMAIN = "sloopquest.com"
_DEMO_EMAIL_PREFIX = "demo"


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
    is_onboarded: bool
    onboarding_state: str | None


@post("/magic-link/request", tags=["auth"], middleware=[_rate_limit.middleware], exclude_from_auth=True)
async def request_magic_link(
    data: MagicLinkRequestBody,
    request: Request,
    auth_service: AuthService,
    transaction: AsyncSession,
) -> dict[str, str]:
    """Request a magic link. Demo addresses (demo@ / demo+*@sloopquest.com) log in instantly."""
    email = data.email.strip().lower()
    local, _, domain = email.partition("@")

    is_demo = domain == _DEMO_EMAIL_DOMAIN and (
        local == _DEMO_EMAIL_PREFIX or local.startswith(f"{_DEMO_EMAIL_PREFIX}+")
    )
    if is_demo:
        await transaction.execute(text("SET LOCAL app.is_system_mode = 'true'"))
        user = (await transaction.execute(select(User).where(User.email == email))).scalar_one_or_none()
        await transaction.execute(text("SET LOCAL app.is_system_mode = 'false'"))
        if user is not None:
            request.set_session({"user_id": int(user.id)})
            logger.info("Demo login for %s", email)
            return {"message": "Authenticated", "redirect": "/"}

    try:
        await auth_service.request_magic_link(data.email)
    except Exception:
        logger.exception("Failed to send magic link to %s", data.email)
    return {"message": "If that email exists, a magic link has been sent."}


@get("/magic-link/verify", tags=["auth"], exclude_from_auth=True)
async def verify_magic_link(
    token: str,
    request: Request,
    auth_service: AuthService,
) -> dict[str, str]:
    """Verify a magic link token and set session."""
    existing_user_id = request.session.get("user_id")
    user = await auth_service.verify_magic_link(token)

    if user is not None:
        request.set_session({"user_id": int(user.id)})
        return {"message": "Authenticated"}
    if existing_user_id is not None:
        return {"message": "Already authenticated"}

    raise PermissionDeniedException("Invalid or expired magic link.")


@post("/logout", tags=["auth"], exclude_from_auth=True)
async def logout(request: Request) -> dict[str, str]:
    """Clear the current session."""
    request.clear_session()
    return {"message": "Logged out"}


@get("/me", guards=[requires_session], tags=["auth"])
async def me(user: User, transaction: AsyncSession) -> MeResponse:
    fresh = (
        await transaction.execute(select(User).options(undefer(User.is_onboarded)).where(User.id == user.id))
    ).scalar_one()
    onboarding_state = await transaction.scalar(select(Onboarding.state).where(Onboarding.user_id == user.id))
    return MeResponse(
        id=fresh.id,
        name=fresh.name,
        email=fresh.email,
        email_verified=fresh.email_verified,
        role=fresh.role,
        is_onboarded=fresh.is_onboarded,
        onboarding_state=onboarding_state,
    )


auth_router = Router(
    path="/auth",
    route_handlers=[request_magic_link, verify_magic_link, logout, me],
    tags=["auth"],
)
