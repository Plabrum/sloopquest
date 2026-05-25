from __future__ import annotations

from datetime import datetime

from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class PricingTierListItem(ActionableList):
    id: Sqid
    guide_id: Sqid
    length_until_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None


class PricingTierDetail(ActionableDetail):
    id: Sqid
    guide_id: Sqid
    length_until_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None


class PricingGuideListItem(ActionableList):
    id: Sqid
    name: str
    service_type: ServiceType
    is_active: bool
    created_at: datetime


class PricingGuideDetail(ActionableDetail):
    id: Sqid
    name: str
    service_type: ServiceType
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CreatePricingGuideData(BaseSchema):
    name: str
    service_type: ServiceType


class UpdatePricingGuideData(BaseSchema):
    name: str
    service_type: ServiceType


class AddPricingTierData(BaseSchema):
    guide_id: Sqid
    length_until_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None


class UpdatePricingTierData(BaseSchema):
    length_until_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None
