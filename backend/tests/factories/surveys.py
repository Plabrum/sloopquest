"""Factories for Survey and related models."""

from faker import Faker
from polyfactory import Use

from app.domain.surveys.models import Survey, SurveyTemplate

from .base import BaseFactory

fake = Faker()


class SurveyTemplateFactory(BaseFactory):
    __model__ = SurveyTemplate

    name = Use(lambda: f"Template {fake.word()}")
    tags = Use(lambda: [])
    definition = Use(lambda: {"sections": []})


class SurveyFactory(BaseFactory):
    __model__ = Survey

    template_id = None

    vessel = None
    assigned_surveyor = None
    template = None
