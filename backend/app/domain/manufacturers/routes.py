from __future__ import annotations

from litestar import Router

from app.domain.manufacturers.models import Manufacturer
from app.domain.manufacturers.schemas import ManufacturerDetail, ManufacturerListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(manufacturer: Manufacturer, user: User) -> ManufacturerListItem:
    return ManufacturerListItem(
        id=manufacturer.id,
        name=manufacturer.name,
        country=manufacturer.country,
        created_at=manufacturer.created_at,
    )


def _to_detail(manufacturer: Manufacturer, user: User) -> ManufacturerDetail:
    return ManufacturerDetail(
        id=manufacturer.id,
        name=manufacturer.name,
        country=manufacturer.country,
        website=manufacturer.website,
        created_at=manufacturer.created_at,
        updated_at=manufacturer.updated_at,
    )


_config = CRUDConfig(
    model=Manufacturer,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    filterable_columns={"name", "country", "created_at"},
    sortable_columns={"name", "country", "created_at"},
    label_field="name",
)

_controller = make_crud_controller("/manufacturers", _config)

manufacturer_router = Router(path="/manufacturers", route_handlers=[_controller], tags=["manufacturers"])
