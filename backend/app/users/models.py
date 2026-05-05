"""User type — minimal stub for typing. Replaced by a real SQLAlchemy model when auth lands."""

from typing import Protocol

from app.users.roles import Role


class User(Protocol):
    id: int
    role_enum: Role
