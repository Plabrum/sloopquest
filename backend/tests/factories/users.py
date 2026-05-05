"""Factories for User and Organization."""

from datetime import UTC, datetime
from uuid import uuid4

from faker import Faker
from polyfactory import Use

from app.users.models import Organization, User
from app.users.roles import Role

from .base import BaseFactory

fake = Faker()


class OrgFactory(BaseFactory):
    __model__ = Organization

    name = Use(fake.company)
    created_at = Use(fake.date_time_between, start_date="-1y", end_date="now", tzinfo=UTC)
    updated_at = Use(lambda: datetime.now(tz=UTC))


class UserFactory(BaseFactory):
    __model__ = User

    name = Use(fake.name)
    email = Use(lambda: f"test+{uuid4()}@example.com")
    role = Role.ADMIN
    email_verified = False
    phone = Use(fake.phone_number)
    created_at = Use(fake.date_time_between, start_date="-1y", end_date="now", tzinfo=UTC)
    updated_at = Use(lambda: datetime.now(tz=UTC))
