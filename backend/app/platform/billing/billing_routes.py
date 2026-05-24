from __future__ import annotations

from litestar import Router, post
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import Organization, User
from app.platform.auth.guards import requires_session
from app.platform.base.schemas import BaseSchema
from app.platform.billing.service import BillingService


class SetupIntentResponse(BaseSchema):
    client_secret: str


@post("/setup-intent", guards=[requires_session])
async def create_setup_intent(
    user: User,
    organization: Organization,
    billing_service: BillingService,
    transaction: AsyncSession,
) -> SetupIntentResponse:
    customer_id = organization.stripe_customer_id
    if not customer_id:
        merged_org = await transaction.merge(organization)
        customer_id = await billing_service.create_customer(name=organization.name, email=user.email)
        merged_org.stripe_customer_id = customer_id

    client_secret = await billing_service.create_setup_intent(customer_id=customer_id)
    return SetupIntentResponse(client_secret=client_secret)


billing_router = Router(
    path="/billing",
    route_handlers=[create_setup_intent],
    tags=["billing"],
)
