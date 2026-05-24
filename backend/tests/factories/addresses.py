"""Factory for Address."""

from faker import Faker
from polyfactory import Use

from app.domain.addresses.models import Address

from .base import BaseFactory

fake = Faker()


class AddressFactory(BaseFactory):
    __model__ = Address

    line1 = Use(fake.street_address)
    line2 = None
    city = Use(fake.city)
    region = Use(fake.state_abbr)
    postal_code = Use(fake.postcode)
    country = "US"
    lat = None
    lng = None
