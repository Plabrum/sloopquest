from enum import Enum


class SubscriptionStatus(Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    paused = "paused"
    cancelled = "cancelled"


class SubscriptionPlan(Enum):
    starter = "starter"
    professional = "professional"
    enterprise = "enterprise"
