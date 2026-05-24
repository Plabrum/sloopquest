"""Factories for User and Organization."""

from datetime import UTC, datetime
from uuid import uuid4

from faker import Faker
from polyfactory import Use

from app.domain.users.models import Organization, User
from app.domain.users.roles import Role

from .base import BaseFactory

fake = Faker()


class OrgFactory(BaseFactory):
    __model__ = Organization

    name = Use(fake.company)
    phone = None
    email = None
    website = None
    address_id = None
    nams_member_number = None
    sams_member_number = None
    signature_block = None
    report_footer = None
    created_at = Use(fake.date_time_between, start_date="-1y", end_date="now", tzinfo=UTC)
    updated_at = Use(lambda: datetime.now(tz=UTC))


class UserFactory(BaseFactory):
    __model__ = User

    name = Use(fake.name)
    email = Use(lambda: f"test+{uuid4()}@example.com")
    role = Role.ADMIN
    email_verified = False
    phone = Use(fake.phone_number)
    inbox_local_part = None
    created_at = Use(fake.date_time_between, start_date="-1y", end_date="now", tzinfo=UTC)
    updated_at = Use(lambda: datetime.now(tz=UTC))
