from __future__ import annotations

import msgspec
from litestar import Router, get
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.dashboard.enums import WidgetType
from app.platform.dashboard.models import Dashboard, Widget
from app.platform.dashboard.schemas import DashboardRead, WidgetQuery, WidgetRead

_ALL_WIDGET_TYPES = list(WidgetType)


def _widget_to_read(widget: Widget) -> WidgetRead:
    return WidgetRead(
        id=widget.id,
        dashboard_id=widget.dashboard_id,
        type=widget.type,
        title=widget.title,
        description=widget.description,
        query=msgspec.convert(widget.query, WidgetQuery),
        position_x=widget.position_x,
        position_y=widget.position_y,
        size_w=widget.size_w,
        size_h=widget.size_h,
        created_at=widget.created_at,
        updated_at=widget.updated_at,
    )


def _to_read(dashboard: Dashboard, widgets: list[Widget]) -> DashboardRead:
    return DashboardRead(
        id=dashboard.id,
        widgets=[_widget_to_read(w) for w in widgets],
        widget_types=_ALL_WIDGET_TYPES,
        updated_at=dashboard.updated_at,
    )


@get("/", guards=[requires_session], tags=["dashboard"], operation_id="get_dashboard")
async def get_dashboard_handler(user: User, transaction: AsyncSession) -> DashboardRead:
    result = await transaction.execute(
        select(Dashboard).where(Dashboard.user_id == user.id).options(selectinload(Dashboard.widgets))
    )
    dashboard = result.scalar_one_or_none()
    if dashboard is None:
        dashboard = Dashboard(user_id=user.id)
        transaction.add(dashboard)
        await transaction.flush()
        widgets: list[Widget] = []
    else:
        widgets = list(dashboard.widgets)
    return _to_read(dashboard, widgets)


dashboard_router = Router(path="/dashboard", route_handlers=[get_dashboard_handler])
