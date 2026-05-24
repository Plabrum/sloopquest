from __future__ import annotations

from litestar import Router

from app.domain.reports.models import Report
from app.domain.reports.schemas import ReportDetail, ReportListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig


def _to_list_item(report: Report, user: User) -> ReportListItem:
    return ReportListItem(
        id=report.id,
        state=report.state,
        survey_id=report.survey_id,
        title=report.title,
        created_at=report.created_at,
    )


def _to_detail(report: Report, user: User) -> ReportDetail:
    return ReportDetail(
        id=report.id,
        state=report.state,
        survey_id=report.survey_id,
        title=report.title,
        summary=report.summary,
        market_value_cents=report.market_value_cents,
        replacement_value_cents=report.replacement_value_cents,
        watermarked_file_key=report.watermarked_file_key,
        released_file_key=report.released_file_key,
        released_at=report.released_at,
        blocks=report.blocks or [],
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


_config = CRUDConfig(
    model=Report,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    filterable_columns={"state", "survey_id", "created_at"},
    sortable_columns={"title", "created_at"},
    label_field="title",
    data_fields=[
        FieldConfig("market_value_cents", "Market Value", FieldType.CENTS),
        FieldConfig("replacement_value_cents", "Replacement Value", FieldType.CENTS),
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("released_at", "Released", FieldType.DATETIME, aggregatable=False, filterable=True),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_controller = make_crud_controller("", _config)

report_router = Router(path="/reports", route_handlers=[_controller], tags=["reports"])
