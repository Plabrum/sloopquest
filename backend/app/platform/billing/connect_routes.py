from __future__ import annotations

from typing import Annotated

import msgspec
from litestar import Router, get, patch, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException
from litestar.params import Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import Organization, User
from app.platform.auth.guards import requires_session
from app.platform.billing.connect_schemas import (
    AcceptTosData,
    AttachExternalAccountData,
    ConnectAccountRequirementsResponse,
    ConnectAccountResponse,
    ConnectAccountStatusResponse,
    ExternalAccountResponse,
    IdentityDocumentResponse,
    UpdateConnectAccountData,
)
from app.platform.billing.service import BillingService


def _drop_none(value: object) -> object:
    if isinstance(value, dict):
        return {k: _drop_none(v) for k, v in value.items() if v is not None}
    return value


@post("/account", guards=[requires_session])
async def create_connect_account(
    user: User,
    organization: Organization,
    billing_service: BillingService,
    transaction: AsyncSession,
) -> ConnectAccountResponse:
    if not organization.stripe_account_id:
        account_id = await billing_service.create_connected_account(name=organization.name, email=user.email)
        merged_org = await transaction.merge(organization)
        merged_org.stripe_account_id = account_id
        return ConnectAccountResponse(stripe_account_id=account_id)
    return ConnectAccountResponse(stripe_account_id=organization.stripe_account_id)


@patch("/account", guards=[requires_session])
async def update_connect_account(
    data: UpdateConnectAccountData,
    user: User,
    organization: Organization,
    billing_service: BillingService,
    transaction: AsyncSession,
) -> ConnectAccountResponse:
    if not organization.stripe_account_id:
        account_id = await billing_service.create_connected_account(name=organization.name, email=user.email)
        merged_org = await transaction.merge(organization)
        merged_org.stripe_account_id = account_id
    else:
        account_id = organization.stripe_account_id

    payload = msgspec.to_builtins(data)
    fields = _drop_none(payload)
    if isinstance(fields, dict) and fields:
        await billing_service.update_connected_account(stripe_account_id=account_id, fields=fields)

    return ConnectAccountResponse(stripe_account_id=account_id)


@get("/account/requirements", guards=[requires_session])
async def get_connect_account_requirements(
    organization: Organization,
    billing_service: BillingService,
) -> ConnectAccountRequirementsResponse:
    if not organization.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    account = await billing_service.retrieve_connected_account(organization.stripe_account_id)
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
    organization: Organization,
    billing_service: BillingService,
) -> ConnectAccountResponse:
    if not organization.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    await billing_service.accept_tos(account_id=organization.stripe_account_id, ip=data.ip, user_agent=data.user_agent)
    return ConnectAccountResponse(stripe_account_id=organization.stripe_account_id)


@post("/account/external-accounts", guards=[requires_session])
async def attach_external_account(
    data: AttachExternalAccountData,
    organization: Organization,
    billing_service: BillingService,
) -> ExternalAccountResponse:
    if not organization.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    external = await billing_service.attach_external_account(
        account_id=organization.stripe_account_id, token=data.token
    )
    return ExternalAccountResponse(
        last4=str(external.get("last4") or ""),
        bank_name=external.get("bank_name"),
        routing_number=external.get("routing_number"),
    )


@get("/account", guards=[requires_session])
async def get_connect_account(
    organization: Organization,
    billing_service: BillingService,
) -> ConnectAccountStatusResponse:
    if not organization.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    account = await billing_service.retrieve_connected_account(organization.stripe_account_id)
    return ConnectAccountStatusResponse(
        stripe_account_id=organization.stripe_account_id,
        charges_enabled=bool(account.get("charges_enabled", False)),
        payouts_enabled=bool(account.get("payouts_enabled", False)),
        requirements=dict(account.get("requirements") or {}),
    )


@post("/account/identity-documents", guards=[requires_session])
async def upload_identity_document(
    data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
    organization: Organization,
    billing_service: BillingService,
) -> IdentityDocumentResponse:
    if not organization.stripe_account_id:
        raise NotFoundException("Connect account has not been created for this organization")

    content = await data.read()
    file_id = await billing_service.upload_identity_document(
        account_id=organization.stripe_account_id,
        file_content=content,
        filename=data.filename or "document",
        content_type=data.content_type or "image/jpeg",
    )
    return IdentityDocumentResponse(file_id=file_id)


connect_router = Router(
    path="/billing/connect",
    route_handlers=[
        create_connect_account,
        update_connect_account,
        get_connect_account,
        get_connect_account_requirements,
        accept_connect_account_tos,
        attach_external_account,
        upload_identity_document,
    ],
    tags=["connect"],
)
