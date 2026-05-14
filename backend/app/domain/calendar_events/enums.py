from enum import Enum


class CalendarEventState(Enum):
    tentative = "tentative"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
