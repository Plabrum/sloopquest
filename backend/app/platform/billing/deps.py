"""Billing service dependency."""

from app.config import config as app_config
from app.platform.billing.client import LocalBillingClient, StripeBillingClient
from app.platform.billing.service import BillingService
from app.utils.deps import dep


@dep("billing_service", sync_to_thread=False)
def provide_billing_service() -> BillingService:
    if app_config.IS_DEV or app_config.ENV == "testing" or not app_config.STRIPE_SECRET_KEY:
        return BillingService(LocalBillingClient())
    return BillingService(StripeBillingClient(app_config))
