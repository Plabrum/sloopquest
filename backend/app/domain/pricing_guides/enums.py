from enum import Enum


class PricingType(Enum):
    flat = "flat"
    per_foot = "per_foot"
    by_quote = "by_quote"


class ServiceType(Enum):
    pre_purchase = "pre_purchase"
    insurance = "insurance"
    damage = "damage"
    sea_trial = "sea_trial"
    delivery = "delivery"
    consultation = "consultation"
    other = "other"
