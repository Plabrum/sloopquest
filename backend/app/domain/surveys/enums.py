from enum import Enum


class SurveyState(Enum):
    inquiry = "inquiry"
    quoted = "quoted"
    scheduled = "scheduled"
    in_field = "in_field"
    in_draft = "in_draft"
    in_review = "in_review"
    delivered = "delivered"
    paid = "paid"
    cancelled = "cancelled"
