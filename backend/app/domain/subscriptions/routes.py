from __future__ import annotations

from litestar import Router

from app.domain.subscriptions.models import Subscription
from app.domain.subscriptions.schemas import SubscriptionDetail, SubscriptionListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(sub: Subscription, user: User) -> SubscriptionListItem:
    return SubscriptionListItem(
        id=sub.id,
        plan=sub.plan,
        state=sub.state,
        trial_ends_at=sub.trial_ends_at,
        current_period_end=sub.current_period_end,
        created_at=sub.created_at,
    )


def _to_detail(sub: Subscription, user: User) -> SubscriptionDetail:
    return SubscriptionDetail(
        id=sub.id,
        plan=sub.plan,
        state=sub.state,
        trial_ends_at=sub.trial_ends_at,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancelled_at=sub.cancelled_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


_config = CRUDConfig(
    model=Subscription,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    filterable_columns={"plan", "state", "created_at"},
    sortable_columns={"current_period_end", "created_at"},
)

_controller = make_crud_controller("", _config)

subscription_router = Router(path="/subscriptions", route_handlers=[_controller], tags=["subscriptions"])
