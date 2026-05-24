from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.domain.users.queries import create_organization, create_user, get_user_by_email, get_user_by_id
from app.domain.users.roles import Role
from app.platform.comms.constants import (
    RESERVED_INBOX_LOCAL_PARTS,
    is_valid_local_part_shape,
    normalize_local_part,
)
from app.utils.exceptions import ApplicationError


class InboxLocalPartError(ApplicationError):
    status_code = 400
    detail = "Invalid inbox local part"


class InboxLocalPartTakenError(InboxLocalPartError):
    status_code = 409
    detail = "Inbox address is already taken"


class InboxAlreadyClaimedError(InboxLocalPartError):
    status_code = 409
    detail = "Inbox has already been claimed for this user"


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
            user.role = Role.ADMIN  # first user of a new org gets surveyor-level access
            await self.db.flush()

        return user, True

    async def is_inbox_local_part_available(self, raw: str) -> tuple[bool, str, str | None]:
        """Return (available, canonical, reason).

        `reason` is None when available, otherwise a stable code: "invalid",
        "reserved", or "taken". Used by the live-check endpoint during onboarding.
        """
        canonical = normalize_local_part(raw)
        if not is_valid_local_part_shape(canonical):
            return False, canonical, "invalid"
        if canonical in RESERVED_INBOX_LOCAL_PARTS:
            return False, canonical, "reserved"
        existing = await self.db.scalar(select(User.id).where(User.inbox_local_part == canonical))
        if existing is not None:
            return False, canonical, "taken"
        return True, canonical, None

    async def claim_inbox_local_part(self, user_id: int, raw: str) -> str:
        """Claim once. Raises if already set, invalid, reserved, or taken.
        Returns the canonical form that was stored."""
        user = await self.db.get(User, user_id)
        if user is None:
            raise InboxLocalPartError("User not found", status_code=404)
        if user.inbox_local_part is not None:
            raise InboxAlreadyClaimedError(f"Inbox already set to '{user.inbox_local_part}'")

        canonical = normalize_local_part(raw)
        if not is_valid_local_part_shape(canonical):
            raise InboxLocalPartError(
                f"'{raw}' is not a valid inbox local part",
            )
        if canonical in RESERVED_INBOX_LOCAL_PARTS:
            raise InboxLocalPartError(
                f"'{canonical}' is reserved",
            )

        # Race: another concurrent claim of the same canonical form would hit
        # the partial unique index and raise IntegrityError on flush. Pre-check
        # to surface a clean 409 in the common (non-racing) path.
        existing = await self.db.scalar(select(User.id).where(User.inbox_local_part == canonical))
        if existing is not None:
            raise InboxLocalPartTakenError(f"'{canonical}' is already taken")

        user.inbox_local_part = canonical
        await self.db.flush()
        return canonical
