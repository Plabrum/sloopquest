import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Config
from app.domain.users.models import User
from app.domain.users.queries import get_user_by_id
from app.domain.users.service import UserService
from app.platform.auth.crypto import generate_secure_token, hash_token
from app.platform.auth.queries import create_magic_link_token, get_valid_magic_link_token
from app.platform.comms.service.emails import EmailService

logger = logging.getLogger(__name__)

MAGIC_LINK_EXPIRY_MINUTES = 15


class AuthService:
    def __init__(
        self, transaction: AsyncSession, user_service: UserService, email_service: EmailService, config: Config
    ) -> None:
        self.db = transaction
        self.user_service = user_service
        self.email_service = email_service
        self.config = config

    async def request_magic_link(self, email: str) -> None:
        """Create a magic link token and email it. Always succeeds silently."""
        email = self.email_service.validate_email_address(email)

        user, _ = await self.user_service.get_or_create_by_email(email)

        token = generate_secure_token()
        token_hash = hash_token(token, self.config.SECRET_KEY)
        expires_at = datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES)

        await create_magic_link_token(self.db, token_hash=token_hash, user_id=user.id, expires_at=expires_at)

        verify_url = f"{self.config.FRONTEND_ORIGIN.rstrip('/')}/auth/magic-link/verify?token={token}"
        await self.email_service.send_magic_link_email(
            to_email=email,
            magic_link_url=verify_url,
            expires_minutes=MAGIC_LINK_EXPIRY_MINUTES,
        )
        logger.info("Magic link sent to %s", email)

    async def verify_magic_link(self, token: str) -> User | None:
        """Verify a magic link token. Returns the user on success, None if invalid/expired."""
        token_hash = hash_token(token, self.config.SECRET_KEY)
        now = datetime.now(UTC)

        ml_token = await get_valid_magic_link_token(self.db, token_hash, now)
        if ml_token is None:
            return None

        ml_token.used_at = now

        user = await get_user_by_id(self.db, ml_token.user_id)
        if user:
            user.email_verified = True

        return user
