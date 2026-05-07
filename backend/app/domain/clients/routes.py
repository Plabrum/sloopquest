from __future__ import annotations

from litestar import Router

from app.domain.clients.enums import ClientType
from app.domain.clients.models import Client
from app.domain.clients.schemas import ClientDetail, ClientListItem
from app.domain.users.models import User
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_list_item(client: Client, user: User) -> ClientListItem:
    return ClientListItem(
        id=client.id,
        client_type=ClientType(client.client_type),
        display_name=client.display_name,
        email=client.email,
        phone=client.phone,
        created_at=client.created_at,
    )


def _to_detail(client: Client, user: User) -> ClientDetail:
    return ClientDetail(
        id=client.id,
        client_type=ClientType(client.client_type),
        display_name=client.display_name,
        email=client.email,
        phone=client.phone,
        first_name=client.first_name,
        last_name=client.last_name,
        company_name=client.company_name,
        claim_contact_name=client.claim_contact_name,
        institution_name=client.institution_name,
        loan_officer_name=client.loan_officer_name,
        brokerage_name=client.brokerage_name,
        agent_name=client.agent_name,
        license_number=client.license_number,
        created_at=client.created_at,
        updated_at=client.updated_at,
    )


_config = CRUDConfig(
    model=Client,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    filterable_columns={"client_type", "display_name", "email", "created_at"},
    sortable_columns={"display_name", "email", "created_at"},
    label_field="display_name",
)

_controller = make_crud_controller("/clients", _config)

client_router = Router(path="/clients", route_handlers=[_controller], tags=["clients"])
