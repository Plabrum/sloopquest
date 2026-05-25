from __future__ import annotations

from litestar import Router, get

from app.config import config
from app.domain.onboarding.enums import OnboardingState
from app.domain.onboarding.models import Onboarding
from app.domain.onboarding.schemas import OnboardingDetail, OnboardingListItem
from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import BaseSchema


class OnboardingConfigResponse(BaseSchema):
    inbox_domain: str


@get("/config", guards=[requires_session], tags=["onboarding"], operation_id="get_onboarding_config")
async def get_onboarding_config() -> OnboardingConfigResponse:
    return OnboardingConfigResponse(inbox_domain=config.INBOX_DOMAIN)


def _to_onboarding_list_item(o: Onboarding, _u: User) -> OnboardingListItem:
    return OnboardingListItem(
        id=o.id,
        state=OnboardingState(o.state) if isinstance(o.state, str) else o.state,
        started_at=o.started_at,
        completed_at=o.completed_at,
    )


def _to_onboarding_detail(o: Onboarding, _u: User) -> OnboardingDetail:
    return OnboardingDetail(
        id=o.id,
        state=OnboardingState(o.state) if isinstance(o.state, str) else o.state,
        started_at=o.started_at,
        completed_at=o.completed_at,
    )


_onboarding_config = CRUDConfig(
    model=Onboarding,
    scope="user",
    to_list_item=_to_onboarding_list_item,
    to_detail=_to_onboarding_detail,
    sortable_columns={"created_at", "updated_at"},
    default_sort="created_at",
)


onboarding_router = Router(
    path="/onboarding",
    route_handlers=[get_onboarding_config],
    tags=["onboarding"],
)


onboardings_router = Router(
    path="/onboardings",
    route_handlers=[make_crud_controller("", _onboarding_config)],
    tags=["onboarding"],
)
