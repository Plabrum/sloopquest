"""Populate the demo organization with realistic fixture data.

Uses polyfactory factories from tests/factories/ for model construction.
Factories handle names, dates, descriptions, etc. via faker — this module
only pins the fields that matter for the demo: states, roles, and FK wiring.
"""

import logging
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.enums import ClientType
from app.domain.invoices.enums import InvoiceState
from app.domain.reports.enums import ReportState
from app.domain.subscriptions.enums import SubscriptionPlan, SubscriptionStatus
from app.domain.surveys.enums import SurveyState
from app.domain.users.models import Organization
from app.domain.users.roles import Role
from app.domain.vessels.enums import FuelType, HullMaterial, PropulsionType, VesselType
from app.platform.state_machine.models import StateTransitionLog

from .wipe import DEMO_ORG_ID, DEMO_ORG_NAME

logger = logging.getLogger(__name__)

# Ensure tests/factories is importable when run as a script
_backend_root = Path(__file__).resolve().parent.parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from tests.factories.clients import ClientFactory  # noqa: E402
from tests.factories.invoices import InvoiceFactory, InvoiceLineItemFactory  # noqa: E402
from tests.factories.reports import ReportFactory  # noqa: E402
from tests.factories.subscriptions import SubscriptionFactory  # noqa: E402
from tests.factories.surveys import SurveyFactory  # noqa: E402
from tests.factories.users import OrgFactory, UserFactory  # noqa: E402
from tests.factories.vessels import EngineFactory, VesselFactory  # noqa: E402

# Survey states spread across the pipeline so the demo shows all stages
_SURVEY_STATES: list[SurveyState] = [
    SurveyState.inquiry,
    SurveyState.scheduled,
    SurveyState.in_field,
    SurveyState.in_draft,
    SurveyState.in_review,
    SurveyState.delivered,
    SurveyState.paid,
    SurveyState.cancelled,
]

_STATE_PATHS: dict[SurveyState, list[SurveyState]] = {
    SurveyState.inquiry: [],
    SurveyState.scheduled: [SurveyState.scheduled],
    SurveyState.in_field: [SurveyState.scheduled, SurveyState.in_field],
    SurveyState.in_draft: [SurveyState.scheduled, SurveyState.in_field, SurveyState.in_draft],
    SurveyState.in_review: [SurveyState.scheduled, SurveyState.in_field, SurveyState.in_draft, SurveyState.in_review],
    SurveyState.delivered: [
        SurveyState.scheduled,
        SurveyState.in_field,
        SurveyState.in_draft,
        SurveyState.in_review,
        SurveyState.delivered,
    ],
    SurveyState.paid: [
        SurveyState.scheduled,
        SurveyState.in_field,
        SurveyState.in_draft,
        SurveyState.in_review,
        SurveyState.delivered,
        SurveyState.paid,
    ],
    SurveyState.cancelled: [SurveyState.cancelled],
}


async def seed_demo_org(session: AsyncSession) -> Organization:
    """Create the demo org and populate it with fixture data."""
    now = datetime.now(tz=UTC)

    # ── 1. Organization ──────────────────────────────────────────────────────
    org = OrgFactory.build(id=DEMO_ORG_ID, name=DEMO_ORG_NAME)
    session.add(org)
    await session.flush()
    logger.info("Created demo org: %s (id=%s)", org.name, org.id)

    # ── 2. Subscription ──────────────────────────────────────────────────────
    subscription = SubscriptionFactory.build(
        organization_id=org.id,
        plan=SubscriptionPlan.professional,
        state=SubscriptionStatus.active,
        current_period_start=now - timedelta(days=15),
        current_period_end=now + timedelta(days=15),
    )
    session.add(subscription)
    await session.flush()
    logger.info("Created subscription")

    # ── 3. Users ─────────────────────────────────────────────────────────────
    user_specs = [
        {"email": "demo@sloopquest.com", "role": Role.ADMIN, "name": "Alex Harrington"},
        {"email": "demo+member@sloopquest.com", "role": Role.MEMBER, "name": "Jordan Reeves"},
    ]
    users = []
    for spec in user_specs:
        user = UserFactory.build(organization_id=org.id, email_verified=True, **spec)
        session.add(user)
        users.append(user)
    await session.flush()
    admin = users[0]
    surveyor = admin
    logger.info("Created %d users", len(users))

    # ── 4. Clients ────────────────────────────────────────────────────────────
    client_specs = [
        {"client_type": ClientType.individual, "display_name": "James & Sarah Whitfield"},
        {"client_type": ClientType.individual, "display_name": "Robert Nguyen"},
        {"client_type": ClientType.insurance_company, "display_name": "Blue Water Marine Insurance"},
        {"client_type": ClientType.lender, "display_name": "Harbor National Bank"},
        {"client_type": ClientType.broker, "display_name": "Coastal Yacht Brokers"},
    ]
    clients = []
    for spec in client_specs:
        client = ClientFactory.build(organization_id=org.id, **spec)
        session.add(client)
        clients.append(client)
    await session.flush()
    logger.info("Created %d clients", len(clients))

    # ── 5. Vessels ────────────────────────────────────────────────────────────
    vessel_specs = [
        {
            "name": "Windward Passage",
            "vessel_type": VesselType.sailboat_monohull,
            "propulsion_type": PropulsionType.sail_aux,
            "hull_material": HullMaterial.frp,
            "year_built": 2008,
            "loa_ft": Decimal("42.5"),
            "beam_ft": Decimal("13.2"),
        },
        {
            "name": "Sea Breeze",
            "vessel_type": VesselType.motor_yacht,
            "propulsion_type": PropulsionType.inboard,
            "hull_material": HullMaterial.frp,
            "year_built": 2015,
            "loa_ft": Decimal("38.0"),
        },
        {
            "name": "Blue Horizon",
            "vessel_type": VesselType.trawler,
            "propulsion_type": PropulsionType.inboard,
            "hull_material": HullMaterial.frp,
            "year_built": 1999,
            "loa_ft": Decimal("44.0"),
        },
    ]
    vessels = []
    for spec in vessel_specs:
        vessel = VesselFactory.build(organization_id=org.id, **spec)
        session.add(vessel)
        vessels.append(vessel)
    await session.flush()

    # Add an engine to the motor yacht
    engine = EngineFactory.build(vessel_id=vessels[1].id, fuel_type=FuelType.diesel, horsepower=320)
    session.add(engine)
    await session.flush()
    logger.info("Created %d vessels", len(vessels))

    # ── 6. Surveys ────────────────────────────────────────────────────────────
    surveys = []
    for i, survey_state in enumerate(_SURVEY_STATES):
        vessel = vessels[i % len(vessels)]
        survey = SurveyFactory.build(
            organization_id=org.id,
            vessel_id=vessel.id,
            assigned_surveyor_id=surveyor.id,
            state=survey_state,
        )
        session.add(survey)
        surveys.append(survey)
    await session.flush()
    logger.info("Created %d surveys", len(surveys))

    # ── 7. State transition logs ──────────────────────────────────────────────
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        path = _STATE_PATHS.get(survey_state, [])
        prev = SurveyState.inquiry
        base_time = now - timedelta(days=60)
        for step_i, next_state in enumerate(path):
            session.add(
                StateTransitionLog(
                    object_type="surveys",
                    object_id=int(survey.id),
                    from_state=prev.value,
                    to_state=next_state.value,
                    actor_id=int(admin.id),
                    context={"source": "demo_seed"},
                    created_at=base_time + timedelta(days=step_i * 4),
                )
            )
            prev = next_state
    await session.flush()
    logger.info("Created state transition logs")

    # ── 8. Invoices ───────────────────────────────────────────────────────────
    invoiced_states = {SurveyState.delivered, SurveyState.paid}
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        if survey_state not in invoiced_states:
            continue
        client = clients[surveys.index(survey) % len(clients)]
        invoice_state = InvoiceState.paid if survey_state == SurveyState.paid else InvoiceState.sent
        invoice = InvoiceFactory.build(
            organization_id=org.id,
            survey_id=survey.id,
            client_id=client.id,
            state=invoice_state,
            invoice_number=f"INV-{1000 + surveys.index(survey)}",
            issued_at=now - timedelta(days=10),
            due_at=now + timedelta(days=20),
            subtotal_cents=75000,
            total_cents=75000,
        )
        session.add(invoice)
        await session.flush()
        session.add(
            InvoiceLineItemFactory.build(
                invoice_id=invoice.id,
                description="Marine Survey Services",
                quantity=Decimal("1.00"),
                unit_price_cents=75000,
            )
        )
    await session.flush()
    logger.info("Created invoices")

    # ── 9. Reports ────────────────────────────────────────────────────────────
    reported_states = {SurveyState.in_review, SurveyState.delivered, SurveyState.paid}
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        if survey_state not in reported_states:
            continue
        report_state = (
            ReportState.released
            if survey_state in (SurveyState.delivered, SurveyState.paid)
            else ReportState.ready_for_review
        )
        session.add(
            ReportFactory.build(
                organization_id=org.id,
                survey_id=survey.id,
                state=report_state,
                title=f"Survey Report — {survey_state.value.replace('_', ' ').title()}",
                released_at=now - timedelta(days=5) if report_state == ReportState.released else None,
            )
        )
    await session.flush()
    logger.info("Created reports")

    logger.info("Demo seed complete — org=%s", org.name)
    return org
