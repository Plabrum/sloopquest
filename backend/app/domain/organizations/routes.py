from __future__ import annotations

import msgspec
from litestar import Router, get, patch, post
from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.organizations.schemas import (
    AcceptTosData,
    AttachExternalAccountData,
    ConnectAccountRequirementsResponse,
    ConnectAccountResponse,
    ExternalAccountResponse,
    UpdateConnectAccountData,
)
from app.domain.users.models import Organization, User
from app.platform.auth.guards import requires_session
from app.platform.billing.service import BillingService


async def _get_user_org(transaction: AsyncSession, user: User) -> Organization:
    result = await transaction.execute(select(Organization).where(Organization.id == user.organization_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundException("Organization not found")
    return org


def _drop_none(value: object) -> object:
    if isinstance(value, dict):
        return {k: _drop_none(v) for k, v in value.items() if v is not None}
    return value


@post("/account", guards=[requires_session])
async def create_connect_account(
    user: User,
    transaction: AsyncSession,
    billing_service: BillingService,
) -> ConnectAccountResponse:
    org = await _get_user_org(transaction, user)
    if not org.stripe_account_id:
        org.stripe_account_id = await billing_service.create_connected_account(name=org.name, email=user.email)
    return ConnectAccountResponse(stripe_account_id=org.stripe_account_id)


@patch("/account", guards=[requires_session])
async def update_connect_account(
    data: UpdateConnectAccountData,
    user: User,
    transaction: AsyncSession,
    billing_service: BillingService,
) -> ConnectAccountResponse:
    org = await _get_user_org(transaction, user)
    if not org.stripe_account_id:
        org.stripe_account_id = await billing_service.create_connected_account(name=org.name, email=user.email)

    payload = msgspec.to_builtins(data)
    fields = _drop_none(payload)
    if isinstance(fields, dict) and fields:
        await billing_service.update_connected_account(stripe_account_id=org.stripe_account_id, fields=fields)

    return ConnectAccountResponse(stripe_account_id=org.stripe_account_id)


@get("/account/requirements", guards=[requires_session])
async def get_connect_account_requirements(
    user: User,
    transaction: AsyncSession,
    billing_service: BillingService,
) -> ConnectAccountRequirementsResponse:
    org = await _get_user_org(transaction, user)
    if not org.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    account = await billing_service.retrieve_connected_account(org.stripe_account_id)
    requirements = account.get("requirements") or {}
    return ConnectAccountRequirementsResponse(
        currently_due=list(requirements.get("currently_due") or []),
        eventually_due=list(requirements.get("eventually_due") or []),
        pending_verification=list(requirements.get("pending_verification") or []),
        future_requirements=dict(account.get("future_requirements") or {}),
        charges_enabled=bool(account.get("charges_enabled", False)),
        payouts_enabled=bool(account.get("payouts_enabled", False)),
    )


@post("/account/tos-acceptance", guards=[requires_session])
async def accept_connect_account_tos(
    data: AcceptTosData,
    user: User,
    transaction: AsyncSession,
    billing_service: BillingService,
) -> ConnectAccountResponse:
    org = await _get_user_org(transaction, user)
    if not org.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    await billing_service.accept_tos(account_id=org.stripe_account_id, ip=data.ip, user_agent=data.user_agent)
    return ConnectAccountResponse(stripe_account_id=org.stripe_account_id)


@post("/account/external-accounts", guards=[requires_session])
async def attach_external_account(
    data: AttachExternalAccountData,
    user: User,
    transaction: AsyncSession,
    billing_service: BillingService,
) -> ExternalAccountResponse:
    org = await _get_user_org(transaction, user)
    if not org.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    external = await billing_service.attach_external_account(account_id=org.stripe_account_id, token=data.token)
    return ExternalAccountResponse(
        last4=str(external.get("last4") or ""),
        bank_name=external.get("bank_name"),
        routing_number=external.get("routing_number"),
    )


organization_router = Router(
    path="/organizations/me/connect",
    route_handlers=[
        create_connect_account,
        update_connect_account,
        get_connect_account_requirements,
        accept_connect_account_tos,
        attach_external_account,
    ],
    tags=["organizations"],
)
