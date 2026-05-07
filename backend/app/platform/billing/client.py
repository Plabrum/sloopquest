"""Stripe billing client implementations."""

import logging
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime

import stripe

from app.config import Config

logger = logging.getLogger(__name__)


class BaseBillingClient(ABC):
    @abstractmethod
    async def create_customer(self, name: str, email: str) -> str:
        """Create a Stripe customer. Returns the customer ID."""

    @abstractmethod
    async def create_subscription(
        self, customer_id: str, price_id: str
    ) -> tuple[str, datetime | None, datetime | None]:
        """Create a subscription. Returns (subscription_id, period_start, period_end)."""

    @abstractmethod
    async def update_subscription(self, subscription_id: str, price_id: str) -> None:
        """Update the plan on an existing subscription."""

    @abstractmethod
    async def cancel_subscription(self, subscription_id: str) -> None:
        """Cancel a subscription at period end."""

    @abstractmethod
    async def create_account(self, name: str, email: str) -> str:
        """Create a Stripe Connect account. Returns the account ID."""

    @abstractmethod
    async def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> str:
        """Create a Connect onboarding link. Returns the URL."""

    @abstractmethod
    async def retrieve_account(self, account_id: str) -> dict:
        """Retrieve a Connect account. Returns the raw Stripe account object as a dict."""

    @abstractmethod
    async def update_account(self, account_id: str, fields: dict) -> dict:
        """Update fields on a Connect account. Returns the updated Stripe account object as a dict."""

    @abstractmethod
    async def accept_tos(self, account_id: str, ip: str, user_agent: str) -> None:
        """Record Stripe Terms of Service acceptance for a Connect account."""

    @abstractmethod
    async def attach_external_account(self, account_id: str, token: str) -> dict:
        """Attach a bank account or debit card token to a Connect account. Returns the external account dict."""

    @abstractmethod
    async def create_payment_link(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> str:
        """Create a one-time Checkout Session URL for a Connect account invoice."""


class LocalBillingClient(BaseBillingClient):
    """Logs Stripe calls instead of hitting the API — used for dev and tests."""

    async def create_customer(self, name: str, email: str) -> str:
        customer_id = f"cus_local_{uuid.uuid4().hex[:16]}"
        logger.info("LOCAL BILLING: create_customer name=%r email=%r → %s", name, email, customer_id)
        return customer_id

    async def create_subscription(
        self, customer_id: str, price_id: str
    ) -> tuple[str, datetime | None, datetime | None]:
        subscription_id = f"sub_local_{uuid.uuid4().hex[:16]}"
        now = datetime.now(tz=UTC)
        logger.info(
            "LOCAL BILLING: create_subscription customer=%s price=%s → %s", customer_id, price_id, subscription_id
        )
        return subscription_id, now, None

    async def update_subscription(self, subscription_id: str, price_id: str) -> None:
        logger.info("LOCAL BILLING: update_subscription sub=%s price=%s", subscription_id, price_id)

    async def cancel_subscription(self, subscription_id: str) -> None:
        logger.info("LOCAL BILLING: cancel_subscription sub=%s", subscription_id)

    async def create_account(self, name: str, email: str) -> str:
        account_id = f"acct_local_{uuid.uuid4().hex[:16]}"
        logger.info("LOCAL BILLING: create_account name=%r email=%r → %s", name, email, account_id)
        return account_id

    async def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> str:
        url = f"https://connect.stripe.com/setup/local/{account_id}"
        logger.info("LOCAL BILLING: create_account_link account=%s → %s", account_id, url)
        return url

    async def retrieve_account(self, account_id: str) -> dict:
        logger.info("LOCAL BILLING: retrieve_account account=%s", account_id)
        return {
            "id": account_id,
            "charges_enabled": True,
            "payouts_enabled": True,
            "requirements": {
                "currently_due": [],
                "eventually_due": [],
                "pending_verification": [],
            },
            "future_requirements": {
                "currently_due": [],
                "eventually_due": [],
                "pending_verification": [],
            },
        }

    async def update_account(self, account_id: str, fields: dict) -> dict:
        logger.info("LOCAL BILLING: update_account account=%s fields=%r", account_id, fields)
        return {"id": account_id, **fields}

    async def accept_tos(self, account_id: str, ip: str, user_agent: str) -> None:
        logger.info("LOCAL BILLING: accept_tos account=%s ip=%s user_agent=%r", account_id, ip, user_agent)

    async def attach_external_account(self, account_id: str, token: str) -> dict:
        ba_id = f"ba_local_{uuid.uuid4().hex[:16]}"
        logger.info("LOCAL BILLING: attach_external_account account=%s token=%s → %s", account_id, token, ba_id)
        return {
            "id": ba_id,
            "object": "bank_account",
            "last4": "6789",
            "bank_name": "Local Test Bank",
            "routing_number": "110000000",
        }

    async def create_payment_link(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> str:
        link = f"https://buy.stripe.com/local_{uuid.uuid4().hex[:16]}"
        logger.info(
            "LOCAL BILLING: create_payment_link amount=%d %s account=%s invoice=%s → %s",
            amount_cents,
            currency,
            connected_account_id,
            invoice_id,
            link,
        )
        return link


class StripeBillingClient(BaseBillingClient):
    """Live Stripe API client."""

    def __init__(self, config: Config) -> None:
        stripe.api_key = config.STRIPE_SECRET_KEY
        self._frontend_origin = config.FRONTEND_ORIGIN

    async def create_customer(self, name: str, email: str) -> str:
        customer = await stripe.Customer.create_async(name=name, email=email)
        return customer.id

    async def create_subscription(
        self, customer_id: str, price_id: str
    ) -> tuple[str, datetime | None, datetime | None]:
        sub = await stripe.Subscription.create_async(
            customer=customer_id,
            items=[{"price": price_id}],
        )
        # Period dates are populated by the customer.subscription.updated webhook.
        return sub.id, None, None

    async def update_subscription(self, subscription_id: str, price_id: str) -> None:
        sub = await stripe.Subscription.retrieve_async(subscription_id)
        item_id = sub.items.data[0].id
        await stripe.Subscription.modify_async(
            subscription_id,
            items=[{"id": item_id, "price": price_id}],
        )

    async def cancel_subscription(self, subscription_id: str) -> None:
        await stripe.Subscription.modify_async(subscription_id, cancel_at_period_end=True)

    async def create_account(self, name: str, email: str) -> str:
        # Use explicit controller properties — NOT the legacy type='custom'/'express'/'standard'.
        # Migrate to POST /v2/core/accounts once the Python SDK fully exposes it.
        account = await stripe.Account.create_async(
            email=email,
            business_profile={"name": name},
            controller={
                "losses": {"payments": "application"},
                "fees": {"payer": "application"},
                "stripe_dashboard": {"type": "express"},
                "requirement_collection": "application",
            },
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )
        return account.id

    async def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> str:
        link = await stripe.AccountLink.create_async(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )
        return link.url

    async def retrieve_account(self, account_id: str) -> dict:
        account = await stripe.Account.retrieve_async(account_id)
        return account.to_dict()

    async def update_account(self, account_id: str, fields: dict) -> dict:
        account = await stripe.Account.modify_async(account_id, **fields)
        return account.to_dict()

    async def accept_tos(self, account_id: str, ip: str, user_agent: str) -> None:
        now_unix = int(datetime.now(tz=UTC).timestamp())
        await stripe.Account.modify_async(
            account_id,
            tos_acceptance={"date": now_unix, "ip": ip, "user_agent": user_agent},
        )

    async def attach_external_account(self, account_id: str, token: str) -> dict:
        external_account = await stripe.Account.create_external_account_async(
            account_id,
            external_account=token,
        )
        return external_account.to_dict()

    async def create_payment_link(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> str:
        # Checkout Session (one-time URL) with destination charge — funds flow to connected account.
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount_cents,
                        "product_data": {"name": "Invoice Payment"},
                    },
                    "quantity": 1,
                }
            ],
            payment_intent_data={
                "transfer_data": {"destination": connected_account_id},
                "metadata": {"invoice_id": invoice_id},
            },
            success_url=f"{self._frontend_origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self._frontend_origin}/payment/cancelled",
        )
        return session.url or ""
