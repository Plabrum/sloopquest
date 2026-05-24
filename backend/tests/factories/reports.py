"""Factory for Report."""

from faker import Faker

from app.domain.reports.models import Report

from .base import BaseFactory

fake = Faker()


class ReportFactory(BaseFactory):
    __model__ = Report

    title = None
    summary = None
    market_value_cents = None
    replacement_value_cents = None
    watermarked_file_key = None
    released_file_key = None
    released_at = None

    survey = None
    organization = None
