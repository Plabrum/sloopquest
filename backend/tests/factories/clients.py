"""Factory for Client."""

from faker import Faker
from polyfactory import Use

from app.domain.clients.enums import ClientType
from app.domain.clients.models import Client

from .base import BaseFactory

fake = Faker()


class ClientFactory(BaseFactory):
    __model__ = Client

    client_type = ClientType.individual
    user_id = None
    display_name = Use(fake.name)
    email = Use(fake.email)
    phone = Use(fake.phone_number)
    billing_address_id = None
    first_name = Use(fake.first_name)
    last_name = Use(fake.last_name)
    company_name = None
    claim_contact_name = None
    institution_name = None
    loan_officer_name = None
    brokerage_name = None
    agent_name = None
    license_number = None

    billing_address = None
