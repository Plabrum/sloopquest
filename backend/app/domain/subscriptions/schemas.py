from datetime import datetime

from app.domain.subscriptions.enums import SubscriptionPlan, SubscriptionStatus
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class SubscriptionListItem(ActionableList):
    id: Sqid
    plan: SubscriptionPlan
    state: SubscriptionStatus
    trial_ends_at: datetime | None
    current_period_end: datetime | None
    created_at: datetime


class SubscriptionDetail(ActionableDetail):
    id: Sqid
    plan: SubscriptionPlan
    state: SubscriptionStatus
    trial_ends_at: datetime | None
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CreateSubscriptionData(BaseSchema):
    plan: SubscriptionPlan


class UpdateSubscriptionData(BaseSchema):
    plan: SubscriptionPlan
