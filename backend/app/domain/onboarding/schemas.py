from datetime import datetime

from app.domain.onboarding.enums import OnboardingState
from app.domain.pricing_guides.enums import PricingType, ServiceType
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class ClaimInboxData(BaseSchema):
    local_part: str


class OnboardingListItem(ActionableList):
    id: Sqid
    state: OnboardingState
    started_at: datetime | None
    completed_at: datetime | None


class OnboardingDetail(ActionableDetail):
    id: Sqid
    state: OnboardingState
    started_at: datetime | None
    completed_at: datetime | None


class OnboardingPricingTierInput(BaseSchema):
    length_until_ft: float | None
    pricing_type: PricingType
    amount_cents: int | None


class ConfirmPricingData(BaseSchema):
    service_type: ServiceType
    tiers: list[OnboardingPricingTierInput]
