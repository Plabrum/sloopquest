from enum import Enum


class QuoteState(Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    declined = "declined"
