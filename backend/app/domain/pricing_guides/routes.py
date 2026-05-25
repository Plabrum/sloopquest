from __future__ import annotations

from litestar import Router

from app.domain.pricing_guides.models import PricingGuide, PricingTier
from app.domain.pricing_guides.schemas import (
    PricingGuideDetail,
    PricingGuideListItem,
    PricingTierDetail,
    PricingTierListItem,
)
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig


def _to_guide_list_item(guide: PricingGuide, user: User) -> PricingGuideListItem:
    return PricingGuideListItem(
        id=guide.id,
        name=guide.name,
        service_type=guide.service_type,
        is_active=guide.is_active,
        created_at=guide.created_at,
    )


def _to_guide_detail(guide: PricingGuide, user: User) -> PricingGuideDetail:
    return PricingGuideDetail(
        id=guide.id,
        name=guide.name,
        service_type=guide.service_type,
        is_active=guide.is_active,
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


def _to_tier_list_item(tier: PricingTier, user: User) -> PricingTierListItem:
    return PricingTierListItem(
        id=tier.id,
        guide_id=tier.guide_id,
        length_until_ft=float(tier.length_until_ft) if tier.length_until_ft is not None else None,
        pricing_type=tier.pricing_type,
        amount_cents=tier.amount_cents,
    )


def _to_tier_detail(tier: PricingTier, user: User) -> PricingTierDetail:
    return PricingTierDetail(
        id=tier.id,
        guide_id=tier.guide_id,
        length_until_ft=float(tier.length_until_ft) if tier.length_until_ft is not None else None,
        pricing_type=tier.pricing_type,
        amount_cents=tier.amount_cents,
    )


_guide_config = CRUDConfig(
    model=PricingGuide,
    to_list_item=_to_guide_list_item,
    to_detail=_to_guide_detail,
    filterable_columns={"is_active", "service_type", "created_at"},
    sortable_columns={"name", "service_type", "created_at"},
    label_field="name",
    data_fields=[
        FieldConfig("name", "Name", FieldType.STRING),
        FieldConfig("service_type", "Service Type", FieldType.STRING),
        FieldConfig("is_active", "Active", FieldType.BOOL),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_tier_config = CRUDConfig(
    model=PricingTier,
    to_list_item=_to_tier_list_item,
    to_detail=_to_tier_detail,
    filterable_columns={"guide_id", "pricing_type"},
    sortable_columns={"length_until_ft", "amount_cents"},
    default_sort="length_until_ft",
)


pricing_guides_router = Router(
    path="/pricing-guides",
    route_handlers=[make_crud_controller("", _guide_config)],
    tags=["pricing_guides"],
)

pricing_tiers_router = Router(
    path="/pricing-tiers",
    route_handlers=[make_crud_controller("", _tier_config)],
    tags=["pricing_tiers"],
)
