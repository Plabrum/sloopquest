from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.service import UserService
from app.utils.deps import dep


@dep("user_service", sync_to_thread=False)
def provide_user_service(transaction: AsyncSession) -> UserService:
    return UserService(transaction)
