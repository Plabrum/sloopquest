"""Billing webhook routes — receives events from Stripe."""

import logging
from datetime import UTC, datetime

import stripe
from litestar import Request, Router, post
from litestar.exceptions import NotAuthorizedException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.invoices.enums import InvoiceState
from app.domain.invoices.models import Invoice
from app.domain.invoices.state_machine import invoice_state_machine
from app.domain.subscriptions.enums import SubscriptionStatus
from app.domain.subscriptions.models import Subscription
from app.domain.subscriptions.state_machine import subscription_state_machine
from app.domain.users.models import Organization
from app.domain.users.roles import Role
from app.platform.state_machine.machine import StateMachineService

logger = logging.getLogger(__name__)


async def _verify_stripe_signature(request: Request, secret: str) -> stripe.Event:
    """Verify Stripe-Signature header and return the parsed event."""
    sig = request.headers.get("Stripe-Signature")
    if not sig:
        raise NotAuthorizedException("Missing Stripe-Signature header")
    body = await request.body()
    try:
        return stripe.Webhook.construct_event(body, sig, secret)
    except stripe.SignatureVerificationError as exc:
        raise NotAuthorizedException("Invalid Stripe signature") from exc


@post("/webhooks/billing/stripe", exclude_from_auth=True)
async def handle_platform_webhook(
    request: Request,
    transaction: AsyncSession,
) -> dict[str, str]:
    """Platform Stripe webhook — subscription lifecycle events."""
    # Skip signature verification in dev/test when the secret is not configured.
    if config.STRIPE_WEBHOOK_SECRET:
        event = await _verify_stripe_signature(request, config.STRIPE_WEBHOOK_SECRET)
    else:
        body = await request.json()
        event = stripe.Event.construct_from(body, key=None)  # type: ignore[arg-type]

    event_type: str = event["type"]
    data_object = event["data"]["object"]

    sm = StateMachineService(transaction)

    if event_type == "customer.subscription.updated":
        stripe_sub_id: str = data_object["id"]
        result = await transaction.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub is not None:
            period_start_ts = data_object.get("current_period_start")
            period_end_ts = data_object.get("current_period_end")
            if period_start_ts:
                sub.current_period_start = datetime.fromtimestamp(period_start_ts, tz=UTC)
            if period_end_ts:
                sub.current_period_end = datetime.fromtimestamp(period_end_ts, tz=UTC)

    elif event_type == "customer.subscription.deleted":
        stripe_sub_id = data_object["id"]
        result = await transaction.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub is not None and sub.state != SubscriptionStatus.cancelled:
            await sm.system_transition(subscription_state_machine, sub, SubscriptionStatus.cancelled)

    elif event_type == "invoice.payment_failed":
        stripe_customer_id: str = data_object.get("customer", "")
        org_result = await transaction.execute(
            select(Organization).where(Organization.stripe_customer_id == stripe_customer_id)
        )
        org = org_result.scalar_one_or_none()
        if org is not None:
            sub_result = await transaction.execute(select(Subscription).where(Subscription.organization_id == org.id))
            sub = sub_result.scalar_one_or_none()
            if sub is not None and sub.state == SubscriptionStatus.active:
                await sm.system_transition(subscription_state_machine, sub, SubscriptionStatus.past_due)

    else:
        logger.debug("Unhandled platform webhook event: %s", event_type)

    return {"status": "ok"}


@post("/webhooks/billing/stripe/connect", exclude_from_auth=True)
async def handle_connect_webhook(
    request: Request,
    transaction: AsyncSession,
) -> dict[str, str]:
    """Stripe Connect webhook — account and payment events."""
    if config.STRIPE_CONNECT_WEBHOOK_SECRET:
        event = await _verify_stripe_signature(request, config.STRIPE_CONNECT_WEBHOOK_SECRET)
    else:
        body = await request.json()
        event = stripe.Event.construct_from(body, key=None)  # type: ignore[arg-type]

    event_type = event["type"]
    data_object = event["data"]["object"]

    sm = StateMachineService(transaction)

    if event_type == "account.updated":
        # charges_enabled / payouts_enabled changes — log for now; extend if we
        # need to surface Connect account status on the Organization model.
        account_id: str = data_object["id"]
        charges_enabled: bool = data_object.get("charges_enabled", False)
        payouts_enabled: bool = data_object.get("payouts_enabled", False)
        logger.info(
            "Connect account.updated: %s charges_enabled=%s payouts_enabled=%s",
            account_id,
            charges_enabled,
            payouts_enabled,
        )

    elif event_type == "payment_intent.succeeded":
        invoice_id_str: str | None = data_object.get("metadata", {}).get("invoice_id")
        if invoice_id_str:
            result = await transaction.execute(select(Invoice).where(Invoice.id == int(invoice_id_str)))
            invoice = result.scalar_one_or_none()
            if invoice is not None and invoice_state_machine.can_transition(invoice, InvoiceState.paid, Role.SYSTEM):
                await sm.system_transition(invoice_state_machine, invoice, InvoiceState.paid)

    else:
        logger.debug("Unhandled Connect webhook event: %s", event_type)

    return {"status": "ok"}


billing_webhook_router = Router(
    path="/",
    route_handlers=[handle_platform_webhook, handle_connect_webhook],
)
