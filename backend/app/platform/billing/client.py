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
    async def create_setup_intent(self, customer_id: str) -> str:
        """Create a SetupIntent for saving a payment method. Returns the client_secret."""

    @abstractmethod
    async def retrieve_payment_method(self, payment_method_id: str) -> dict:
        """Retrieve card details for a payment method. Returns {brand, last4, exp_month, exp_year}."""

    @abstractmethod
    async def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        """Set the default payment method on a customer's invoice settings."""

    @abstractmethod
    async def detach_payment_method(self, payment_method_id: str) -> None:
        """Detach a payment method from its customer."""

    @abstractmethod
    async def create_payment_intent(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> tuple[str, str]:
        """Create a PaymentIntent with a destination charge. Returns (payment_intent_id, client_secret)."""

    @abstractmethod
    async def refund_payment_intent(self, payment_intent_id: str, connected_account_id: str) -> str:
        """Refund a destination-charge PaymentIntent. Returns the refund ID."""

    @abstractmethod
    async def cancel_payment_intent(self, payment_intent_id: str) -> None:
        """Cancel a PaymentIntent that has not yet succeeded."""

    @abstractmethod
    async def upload_identity_document(
        self, account_id: str, file_content: bytes, filename: str, content_type: str
    ) -> str:
        """Upload an identity document file to a Connect account. Returns the Stripe file ID."""


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

    async def create_setup_intent(self, customer_id: str) -> str:
        client_secret = f"seti_local_{uuid.uuid4().hex[:16]}_secret_local"
        logger.info("LOCAL BILLING: create_setup_intent customer=%s → %s", customer_id, client_secret)
        return client_secret

    async def retrieve_payment_method(self, payment_method_id: str) -> dict:
        logger.info("LOCAL BILLING: retrieve_payment_method pm=%s", payment_method_id)
        return {"brand": "visa", "last4": "4242", "exp_month": 12, "exp_year": 2030}

    async def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        logger.info("LOCAL BILLING: set_default_payment_method customer=%s pm=%s", customer_id, payment_method_id)

    async def detach_payment_method(self, payment_method_id: str) -> None:
        logger.info("LOCAL BILLING: detach_payment_method pm=%s", payment_method_id)

    async def create_payment_intent(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> tuple[str, str]:
        pi_id = f"pi_local_{uuid.uuid4().hex[:16]}"
        client_secret = f"{pi_id}_secret_local"
        logger.info(
            "LOCAL BILLING: create_payment_intent amount=%d %s account=%s invoice=%s → %s",
            amount_cents,
            currency,
            connected_account_id,
            invoice_id,
            pi_id,
        )
        return pi_id, client_secret

    async def refund_payment_intent(self, payment_intent_id: str, connected_account_id: str) -> str:
        refund_id = f"re_local_{uuid.uuid4().hex[:16]}"
        logger.info(
            "LOCAL BILLING: refund_payment_intent pi=%s account=%s → %s",
            payment_intent_id,
            connected_account_id,
            refund_id,
        )
        return refund_id

    async def cancel_payment_intent(self, payment_intent_id: str) -> None:
        logger.info("LOCAL BILLING: cancel_payment_intent pi=%s", payment_intent_id)

    async def upload_identity_document(
        self, account_id: str, file_content: bytes, filename: str, content_type: str
    ) -> str:
        file_id = f"file_local_{uuid.uuid4().hex[:16]}"
        logger.info(
            "LOCAL BILLING: upload_identity_document account=%s filename=%s → %s",
            account_id,
            filename,
            file_id,
        )
        return file_id


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

    async def create_setup_intent(self, customer_id: str) -> str:
        si = await stripe.SetupIntent.create_async(
            customer=customer_id,
            payment_method_types=["card"],
        )
        assert si.client_secret is not None
        return si.client_secret

    async def retrieve_payment_method(self, payment_method_id: str) -> dict:
        pm = await stripe.PaymentMethod.retrieve_async(payment_method_id)
        card = pm.card
        return {
            "brand": getattr(card, "brand", "") or "",
            "last4": getattr(card, "last4", "") or "",
            "exp_month": getattr(card, "exp_month", 0) or 0,
            "exp_year": getattr(card, "exp_year", 0) or 0,
        }

    async def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        await stripe.Customer.modify_async(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )

    async def detach_payment_method(self, payment_method_id: str) -> None:
        await stripe.PaymentMethod.detach_async(payment_method_id)

    async def create_payment_intent(
        self, amount_cents: int, currency: str, connected_account_id: str, invoice_id: str
    ) -> tuple[str, str]:
        pi = await stripe.PaymentIntent.create_async(
            amount=amount_cents,
            currency=currency.lower(),
            transfer_data={"destination": connected_account_id},
            metadata={"invoice_id": invoice_id},
        )
        assert pi.client_secret is not None
        return pi.id, pi.client_secret

    async def refund_payment_intent(self, payment_intent_id: str, connected_account_id: str) -> str:
        refund = await stripe.Refund.create_async(
            payment_intent=payment_intent_id,
            reverse_transfer=True,
        )
        return refund.id

    async def cancel_payment_intent(self, payment_intent_id: str) -> None:
        await stripe.PaymentIntent.cancel_async(payment_intent_id)

    async def upload_identity_document(
        self, account_id: str, file_content: bytes, filename: str, content_type: str
    ) -> str:
        f = await stripe.File.create_async(
            purpose="identity_document",
            file=(filename, file_content, content_type),
            stripe_account=account_id,
        )
        return f.id
