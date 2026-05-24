from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.pricing_guides.schemas import PricingGuideDetail, PricingGuideListItem, PricingTierOutput
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig


def _to_tier(tier: PricingTier) -> PricingTierOutput:
    return PricingTierOutput(
        id=tier.id,
        service_type=tier.service_type,
        length_min_ft=float(tier.length_min_ft) if tier.length_min_ft is not None else None,
        length_max_ft=float(tier.length_max_ft) if tier.length_max_ft is not None else None,
        pricing_type=tier.pricing_type,
        amount_cents=tier.amount_cents,
        sort_order=tier.sort_order,
    )


def _to_list_item(guide: PricingGuide, user: User) -> PricingGuideListItem:
    return PricingGuideListItem(
        id=guide.id,
        name=guide.name,
        is_active=guide.is_active,
        created_at=guide.created_at,
    )


def _to_detail(guide: PricingGuide, user: User) -> PricingGuideDetail:
    return PricingGuideDetail(
        id=guide.id,
        name=guide.name,
        is_active=guide.is_active,
        tiers=[_to_tier(t) for t in guide.tiers],
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


_config = CRUDConfig(
    model=PricingGuide,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    detail_load_options=[selectinload(PricingGuide.tiers)],
    filterable_columns={"is_active", "created_at"},
    sortable_columns={"name", "created_at"},
    label_field="name",
    data_fields=[
        FieldConfig("name", "Name", FieldType.STRING),
        FieldConfig("is_active", "Active", FieldType.BOOL),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_controller = make_crud_controller("", _config)

pricing_guides_router = Router(path="/pricing-guides", route_handlers=[_controller], tags=["pricing_guides"])
