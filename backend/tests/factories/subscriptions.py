"""Factory for Subscription."""

from faker import Faker

from app.domain.subscriptions.enums import SubscriptionPlan
from app.domain.subscriptions.models import Subscription

from .base import BaseFactory

fake = Faker()


class SubscriptionFactory(BaseFactory):
    __model__ = Subscription

    plan = SubscriptionPlan.starter
    trial_ends_at = None
    current_period_start = None
    current_period_end = None
    cancelled_at = None
    stripe_customer_id = None
    stripe_subscription_id = None

    organization = None
