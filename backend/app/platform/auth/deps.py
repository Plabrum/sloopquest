from typing import Any

from litestar import Request
from litestar.exceptions import NotAuthorizedException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.users.models import User
from app.domain.users.service import UserService
from app.platform.auth.service import AuthService
from app.platform.comms.service.emails import EmailService
from app.utils.deps import dep


@dep("user", sync_to_thread=False)
def provide_current_user(request: Request[User | None, Any, Any]) -> User:
    if request.user is None:
        raise NotAuthorizedException()
    return request.user


@dep("auth_service", sync_to_thread=False)
def provide_auth_service(
    transaction: AsyncSession,
    user_service: UserService,
    email_service: EmailService,
) -> AuthService:
    return AuthService(transaction, user_service, email_service, config=config)
