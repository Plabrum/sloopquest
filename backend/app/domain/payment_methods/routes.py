from __future__ import annotations

from litestar import Router

from app.domain.payment_methods.models import PaymentMethod
from app.domain.payment_methods.schemas import PaymentMethodDetail, PaymentMethodListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(pm: PaymentMethod, user: User) -> PaymentMethodListItem:
    return PaymentMethodListItem(
        id=pm.id,
        brand=pm.brand,
        last4=pm.last4,
        exp_month=pm.exp_month,
        exp_year=pm.exp_year,
        is_default=pm.is_default,
        created_at=pm.created_at,
    )


def _to_detail(pm: PaymentMethod, user: User) -> PaymentMethodDetail:
    return PaymentMethodDetail(
        id=pm.id,
        stripe_payment_method_id=pm.stripe_payment_method_id,
        brand=pm.brand,
        last4=pm.last4,
        exp_month=pm.exp_month,
        exp_year=pm.exp_year,
        is_default=pm.is_default,
        created_at=pm.created_at,
        updated_at=pm.updated_at,
    )


_config = CRUDConfig(
    model=PaymentMethod,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    scope="org",
    sortable_columns={"created_at"},
    filterable_columns={"is_default"},
    label_field="last4",
)

_controller = make_crud_controller("", _config)

payment_method_router = Router(path="/payment-methods", route_handlers=[_controller], tags=["payment-methods"])
