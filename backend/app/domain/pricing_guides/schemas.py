from __future__ import annotations

from datetime import datetime

from app.domain.pricing_guides.enums import PricingType
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class PricingTierOutput(BaseSchema):
    id: Sqid
    service_type: str | None
    length_min_ft: float | None
    length_max_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None
    sort_order: int


class PricingGuideListItem(ActionableList):
    id: Sqid
    name: str
    is_active: bool
    created_at: datetime


class PricingGuideDetail(ActionableDetail):
    id: Sqid
    name: str
    is_active: bool
    tiers: list[PricingTierOutput]
    created_at: datetime
    updated_at: datetime


class CreatePricingGuideData(BaseSchema):
    name: str
    is_active: bool = True


class UpdatePricingGuideData(BaseSchema):
    name: str
    is_active: bool


class AddPricingTierData(BaseSchema):
    service_type: str | None
    length_min_ft: float | None
    length_max_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None
    sort_order: int = 0


class UpdatePricingTierData(BaseSchema):
    tier_id: Sqid
    service_type: str | None
    length_min_ft: float | None
    length_max_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None
    sort_order: int


class RemovePricingTierData(BaseSchema):
    tier_id: Sqid
