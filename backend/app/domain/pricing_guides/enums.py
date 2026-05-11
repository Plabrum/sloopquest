from enum import Enum


class PricingType(Enum):
    flat = "flat"
    per_foot = "per_foot"
    by_quote = "by_quote"
