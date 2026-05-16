from __future__ import annotations

from litestar import Router, get

from app.domain.users.models import User
from app.domain.users.service import UserService
from app.platform.actions.schemas import ActionableDetail, ActionableList
from app.platform.auth.guards import requires_session
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class UserListItem(ActionableList, ActionableDetail):
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


class InboxAvailabilityResponse(BaseSchema):
    available: bool
    canonical: str
    reason: str | None = None


@get(
    "/inbox/available",
    guards=[requires_session],
    tags=["user"],
    operation_id="check_inbox_local_part_available",
)
async def check_inbox_available_handler(
    local_part: str,
    user_service: UserService,
) -> InboxAvailabilityResponse:
    available, canonical, reason = await user_service.is_inbox_local_part_available(local_part)
    return InboxAvailabilityResponse(available=available, canonical=canonical, reason=reason)


user_router = Router(
    path="/users",
    route_handlers=[_controller, check_inbox_available_handler],
    tags=["user"],
)
