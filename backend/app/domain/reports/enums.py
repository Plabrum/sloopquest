from enum import Enum


class ReportState(Enum):
    draft = "draft"
    ready_for_review = "ready_for_review"
    watermarked_delivered = "watermarked_delivered"
    released = "released"
