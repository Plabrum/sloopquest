from datetime import datetime

from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class ManufacturerListItem(ActionableList):
    id: Sqid
    name: str
    country: str | None
    created_at: datetime


class ManufacturerDetail(ActionableDetail):
    id: Sqid
    name: str
    country: str | None
    website: str | None
    created_at: datetime
    updated_at: datetime


class ManufacturerCreateData(BaseSchema):
    name: str
    country: str | None = None
    website: str | None = None


class ManufacturerUpdateData(BaseSchema):
    name: str
    country: str | None
    website: str | None
