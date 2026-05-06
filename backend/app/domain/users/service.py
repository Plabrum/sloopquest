from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.domain.users.queries import create_organization, create_user, get_user_by_email, get_user_by_id
from app.domain.users.roles import Role


class UserService:
    def __init__(self, transaction: AsyncSession) -> None:
        self.db = transaction

    async def get_by_id(self, user_id: int) -> User | None:
        return await get_user_by_id(self.db, user_id)

    async def get_or_create_by_email(self, email: str, organization_id: int | None = None) -> tuple[User, bool]:
        """Return (user, created). If new and no organization_id given, auto-creates a personal org."""
        user = await get_user_by_email(self.db, email)
        if user is not None:
            return user, False

        name = email.split("@", 1)[0]
        org_was_created = organization_id is None
        if org_was_created:
            org = await create_organization(self.db, name=f"{name}'s Organization")
            organization_id = org.id
        user = await create_user(self.db, name=name, email=email, organization_id=organization_id)

        if org_was_created:
            user.role = Role.ADMIN
            await self.db.flush()

        return user, True
