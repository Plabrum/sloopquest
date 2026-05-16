from datetime import datetime

from app.domain.reports.enums import ReportState
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class ReportListItem(ActionableList):
    id: Sqid
    state: ReportState
    survey_id: Sqid
    title: str | None
    created_at: datetime


class ReportDetail(ActionableDetail):
    id: Sqid
    state: ReportState
    survey_id: Sqid
    title: str | None
    summary: str | None
    market_value_cents: int | None
    replacement_value_cents: int | None
    watermarked_file_key: str | None
    released_file_key: str | None
    released_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CreateReportData(BaseSchema):
    survey_id: Sqid
    title: str | None = None


class UpdateReportData(BaseSchema):
    title: str | None
    summary: str | None
    market_value_cents: int | None
    replacement_value_cents: int | None
