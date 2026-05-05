"""User type — minimal stub for typing. Replaced by a real SQLAlchemy model when auth lands."""

from typing import Protocol, runtime_checkable

from app.users.roles import Role


@runtime_checkable
class User(Protocol):
    id: int
    organization_id: int
    role_enum: Role
