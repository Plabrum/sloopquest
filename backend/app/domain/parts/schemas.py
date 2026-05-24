from datetime import datetime

from app.domain.parts.enums import PartCategory
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class PartListItem(ActionableList):
    id: Sqid
    name: str
    part_number: str | None
    category: PartCategory | None
    manufacturer_id: Sqid | None
    created_at: datetime


class PartDetail(ActionableDetail):
    id: Sqid
    name: str
    part_number: str | None
    description: str | None
    category: PartCategory | None
    manufacturer_id: Sqid | None
    created_at: datetime
    updated_at: datetime


class PartCreateData(BaseSchema):
    name: str
    part_number: str | None = None
    description: str | None = None
    category: PartCategory | None = None
    manufacturer_id: Sqid | None = None


class PartUpdateData(BaseSchema):
    name: str
    part_number: str | None
    description: str | None
    category: PartCategory | None
    manufacturer_id: Sqid | None
