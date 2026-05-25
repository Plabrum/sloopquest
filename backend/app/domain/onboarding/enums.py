from enum import StrEnum, auto


class OnboardingState(StrEnum):
    NOT_STARTED = auto()
    INBOX = auto()
    PRICING = auto()
    COMPLETED = auto()
