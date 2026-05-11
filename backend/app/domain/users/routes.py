from __future__ import annotations

from litestar import Router

from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class UserListItem(BaseSchema):
    id: Sqid
    name: str
    email: str


def _to_user_list_item(user: User, _: User) -> UserListItem:
    return UserListItem(id=user.id, name=user.name, email=user.email)


_config = CRUDConfig(
    model=User,
    to_list_item=_to_user_list_item,
    to_detail=_to_user_list_item,
    label_field="name",
    expose_detail=False,
)

_controller = make_crud_controller("", _config)

user_router = Router(path="/users", route_handlers=[_controller], tags=["user"])
