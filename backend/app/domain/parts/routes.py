from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.parts.models import Part
from app.domain.parts.schemas import PartDetail, PartListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(part: Part, user: User) -> PartListItem:
    return PartListItem(
        id=part.id,
        name=part.name,
        part_number=part.part_number,
        category=part.category,
        manufacturer_id=part.manufacturer_id,
        created_at=part.created_at,
    )


def _to_detail(part: Part, user: User) -> PartDetail:
    return PartDetail(
        id=part.id,
        name=part.name,
        part_number=part.part_number,
        description=part.description,
        category=part.category,
        manufacturer_id=part.manufacturer_id,
        created_at=part.created_at,
        updated_at=part.updated_at,
    )


_config = CRUDConfig(
    model=Part,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    detail_load_options=[selectinload(Part.manufacturer)],
    filterable_columns={"name", "category", "manufacturer_id", "created_at"},
    sortable_columns={"name", "category", "created_at"},
    label_field="name",
)

_controller = make_crud_controller("", _config)

part_router = Router(path="/parts", route_handlers=[_controller], tags=["parts"])
