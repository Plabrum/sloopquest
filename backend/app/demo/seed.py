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
from app.domain.onboarding.enums import OnboardingState
from app.domain.onboarding.models import Onboarding
from app.domain.reports.enums import ReportState
from app.domain.subscriptions.enums import SubscriptionPlan, SubscriptionStatus
from app.domain.surveys.enums import SurveyState
from app.domain.users.models import Organization
from app.domain.users.roles import Role
from app.domain.vessels.enums import FuelType, HullMaterial, PropulsionType, VesselType
from app.platform.comms.enums import MessageDirection, MessageState
from app.platform.comms.models.email_threads import EmailThread
from app.platform.comms.models.messages import Message
from app.platform.dashboard.enums import ResourceType, WidgetColor, WidgetType
from app.platform.dashboard.models import Dashboard, Widget
from app.platform.data.enums import AggregationType, Granularity, TimeRange
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.materialize import materialize_form_response
from app.platform.form_dsl.models import FormNode
from app.platform.state_machine.models import StateTransitionLog

from .marine_template import marine_template
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
from tests.factories.surveys import SurveyFactory, SurveyTemplateFactory  # noqa: E402
from tests.factories.users import UserFactory  # noqa: E402
from tests.factories.vessels import EngineFactory, VesselFactory  # noqa: E402

# Survey states spread across the pipeline so the demo shows all stages
_SURVEY_STATES: list[SurveyState] = [
    SurveyState.scheduled,
    SurveyState.in_draft,
    SurveyState.delivered,
    SurveyState.cancelled,
]

_STATE_PATHS: dict[SurveyState, list[SurveyState]] = {
    SurveyState.scheduled: [],
    SurveyState.in_draft: [SurveyState.in_draft],
    SurveyState.delivered: [SurveyState.in_draft, SurveyState.delivered],
    SurveyState.cancelled: [SurveyState.cancelled],
}


async def seed_demo_org(session: AsyncSession) -> Organization:
    """Create the demo org and populate it with fixture data."""
    now = datetime.now(tz=UTC)

    # ── 1. Organization ──────────────────────────────────────────────────────
    # Construct directly: polyfactory's `Use(fake.company)` on OrgFactory overrides
    # explicit `name=`/`id=` kwargs, so the demo org would end up with a random
    # name and an auto-assigned id instead of the fixed DEMO_ORG_ID sentinel.
    org = Organization(id=DEMO_ORG_ID, name=DEMO_ORG_NAME)
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
    for u in users:
        session.add(
            Onboarding(
                user_id=u.id,
                state=OnboardingState.COMPLETED,
                started_at=now,
                completed_at=now,
            )
        )
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
    engine = EngineFactory.build(
        organization_id=org.id, vessel_id=vessels[1].id, fuel_type=FuelType.diesel, horsepower=320
    )
    session.add(engine)
    await session.flush()
    logger.info("Created %d vessels", len(vessels))

    # ── 6a. Survey template ───────────────────────────────────────────────────
    import msgspec  # noqa: PLC0415
    import sqlalchemy as _sa  # noqa: PLC0415

    template_definition = marine_template()
    template = SurveyTemplateFactory.build(
        organization_id=org.id,
        name="Pre-Purchase Survey",
        tags=["pre_purchase", "default"],
        definition=msgspec.to_builtins(template_definition),
    )
    session.add(template)
    await session.flush()
    logger.info("Created survey template: %s (id=%s)", template.name, template.id)

    # ── 6b. Surveys ───────────────────────────────────────────────────────────
    surveys = []
    for i, survey_state in enumerate(_SURVEY_STATES):
        vessel = vessels[i % len(vessels)]
        survey = SurveyFactory.build(
            organization_id=org.id,
            vessel_id=vessel.id,
            assigned_surveyor_id=surveyor.id,
            state=survey_state,
            template_id=template.id,
        )
        session.add(survey)
        surveys.append(survey)
    await session.flush()

    for survey in surveys:
        survey.template_version = await materialize_form_response(
            session,
            survey,
            owner_type="surveys",
            definition=template_definition,
        )
    await session.flush()
    logger.info("Created %d surveys (materialized against template)", len(surveys))

    # ── 6c. Ad-hoc field shared across 3 surveys (triggers PromoteAdHocBanner) ─
    shared_field_def = {
        "id": "ad_hoc_thruster_condition",
        "label": "Bow thruster condition",
        "type": "select",
        "required": False,
        "allow_finding": True,
        "config": {"options": ["good", "fair", "needs_service"]},
        "condition": None,
        "fields": [],
        "min": None,
        "max": None,
        "instance_label_field": None,
    }
    for survey in surveys[:3]:
        nodes = (
            (
                await session.execute(
                    _sa.select(FormNode).where(FormNode.owner_type == "surveys", FormNode.owner_id == survey.id)
                )
            )
            .scalars()
            .all()
        )
        engine_section = next(n for n in nodes if n.kind == FormNodeKind.section and n.schema_ref == "engine")
        engine_subsection = next(
            n for n in nodes if n.kind == FormNodeKind.subsection and n.parent_id == engine_section.id
        )
        existing_count = sum(1 for n in nodes if n.parent_id == engine_subsection.id and n.kind == FormNodeKind.field)
        session.add(
            FormNode(
                organization_id=org.id,
                owner_type="surveys",
                owner_id=survey.id,
                parent_id=engine_subsection.id,
                kind=FormNodeKind.field,
                schema_ref=None,
                label=shared_field_def["label"],
                value=None,
                config=shared_field_def,
                sort_order=existing_count,
            )
        )
    await session.flush()
    logger.info("Created shared ad-hoc field across 3 surveys")

    # ── 7. State transition logs ──────────────────────────────────────────────
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        path = _STATE_PATHS.get(survey_state, [])
        prev = SurveyState.scheduled
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
    invoiced_states = {SurveyState.delivered}
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        if survey_state not in invoiced_states:
            continue
        client = clients[surveys.index(survey) % len(clients)]
        invoice_state = InvoiceState.paid
        invoice = InvoiceFactory.build(
            organization_id=org.id,
            survey_id=survey.id,
            client_id=client.id,
            state=invoice_state,
            identifier=f"INV-{100001 + surveys.index(survey)}",
            issued_at=now - timedelta(days=10),
            due_at=now + timedelta(days=20),
            subtotal_cents=75000,
            total_cents=75000,
        )
        session.add(invoice)
        await session.flush()
        session.add(
            InvoiceLineItemFactory.build(
                organization_id=org.id,
                invoice_id=invoice.id,
                description="Marine Survey Services",
                quantity=Decimal("1.00"),
                unit_price_cents=75000,
            )
        )
    await session.flush()
    logger.info("Created invoices")

    # ── 9. Reports ────────────────────────────────────────────────────────────
    reported_states = {SurveyState.in_draft, SurveyState.delivered}
    for survey, survey_state in zip(surveys, _SURVEY_STATES):
        if survey_state not in reported_states:
            continue
        report_state = ReportState.released if survey_state == SurveyState.delivered else ReportState.ready_for_review
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

    # ── 10. Dashboard + widgets for the admin user ──────────────────────────────
    dashboard = Dashboard(user_id=admin.id)
    session.add(dashboard)
    await session.flush()

    starter_widgets = [
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.STAT_NUMBER,
            title="Revenue MTD",
            position_x=0,
            position_y=0,
            size_w=1,
            size_h=1,
            query={
                "resource": ResourceType.INVOICES.value,
                "field": "total_cents",
                "aggregation": AggregationType.sum.value,
                "time_range": TimeRange.MONTH_TO_DATE.value,
                "filters": [],
                "color": WidgetColor.GREEN.value,
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.STAT_NUMBER,
            title="Surveys MTD",
            position_x=1,
            position_y=0,
            size_w=1,
            size_h=1,
            query={
                "resource": ResourceType.SURVEYS.value,
                "field": "state",
                "time_range": TimeRange.MONTH_TO_DATE.value,
                "filters": [],
                "color": WidgetColor.BLUE.value,
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.STAT_NUMBER,
            title="Total Vessels",
            position_x=2,
            position_y=0,
            size_w=1,
            size_h=1,
            query={
                "resource": ResourceType.VESSELS.value,
                "field": "vessel_type",
                "time_range": TimeRange.ALL_TIME.value,
                "filters": [],
                "color": WidgetColor.YELLOW.value,
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.STAT_NUMBER,
            title="Total Reports",
            position_x=3,
            position_y=0,
            size_w=1,
            size_h=1,
            query={
                "resource": ResourceType.REPORTS.value,
                "field": "state",
                "time_range": TimeRange.ALL_TIME.value,
                "filters": [],
                "color": WidgetColor.RED.value,
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.AREA_CHART,
            title="Revenue (last 90 days)",
            position_x=0,
            position_y=1,
            size_w=3,
            size_h=2,
            query={
                "resource": ResourceType.INVOICES.value,
                "field": "total_cents",
                "aggregation": AggregationType.sum.value,
                "time_range": TimeRange.LAST_90_DAYS.value,
                "granularity": Granularity.WEEK.value,
                "filters": [],
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.BAR_CHART,
            title="Surveys by Week",
            position_x=3,
            position_y=1,
            size_w=1,
            size_h=2,
            query={
                "resource": ResourceType.SURVEYS.value,
                "field": "state",
                "time_range": TimeRange.LAST_30_DAYS.value,
                "filters": [],
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.RESOURCE_TABLE,
            title="Recent Invoices",
            position_x=0,
            position_y=3,
            size_w=2,
            size_h=2,
            query={
                "resource": ResourceType.INVOICES.value,
                "columns": ["identifier", "state", "total_cents"],
                "limit": 5,
                "filters": [],
            },
        ),
        Widget(
            dashboard_id=dashboard.id,
            user_id=admin.id,
            type=WidgetType.CHILD_LIST,
            title="Recent Surveys",
            position_x=2,
            position_y=3,
            size_w=2,
            size_h=2,
            query={
                "resource": ResourceType.SURVEYS.value,
                "limit": 5,
                "filters": [],
            },
        ),
    ]
    for w in starter_widgets:
        session.add(w)
    await session.flush()
    logger.info("Created dashboard with %d starter widgets", len(starter_widgets))

    # ── 11. Email threads + messages ──────────────────────────────────────────
    scheduled_survey = next(s for s, st in zip(surveys, _SURVEY_STATES) if st == SurveyState.scheduled)
    draft_survey = next(s for s, st in zip(surveys, _SURVEY_STATES) if st == SurveyState.in_draft)
    delivered_survey = next(s for s, st in zip(surveys, _SURVEY_STATES) if st == SurveyState.delivered)
    whitfield = clients[0]
    insurance = clients[2]

    thread_a = EmailThread(
        user_id=admin.id,
        subject="Pre-purchase survey inquiry — 1985 Catalina 30",
        survey_id=draft_survey.id,
    )
    thread_b = EmailThread(
        user_id=admin.id,
        subject="Scheduling haul-out next Tuesday",
        client_id=whitfield.id,
        survey_id=scheduled_survey.id,
    )
    thread_c = EmailThread(
        user_id=admin.id,
        subject="Re: Survey Report — quick question on engine hours",
        client_id=whitfield.id,
        survey_id=delivered_survey.id,
    )
    thread_d = EmailThread(
        user_id=admin.id,
        subject="Updated binder requirements",
        client_id=insurance.id,
    )
    thread_e = EmailThread(
        user_id=admin.id,
        subject="2024 sea trial — closed out",
        archived_at=now - timedelta(days=120),
    )
    session.add_all([thread_a, thread_b, thread_c, thread_d, thread_e])
    await session.flush()

    def _inbound(thread: EmailThread, *, s3_key: str, **kw: object) -> Message:
        base: dict[str, object] = dict(
            user_id=admin.id,
            email_thread_id=thread.id,
            direction=MessageDirection.IN,
            state=MessageState.RECEIVED,
            to_emails=[admin.email],
            s3_key=s3_key,
            s3_bucket="sloopquest-demo-inbound",
            spf_pass=True,
            dkim_pass=True,
        )
        base.update(kw)
        return Message(**base)  # type: ignore[arg-type]

    def _outbound(thread: EmailThread, **kw: object) -> Message:
        base: dict[str, object] = dict(
            user_id=admin.id,
            email_thread_id=thread.id,
            direction=MessageDirection.OUT,
            state=MessageState.SENT,
            from_email=admin.email,
            from_name=admin.name,
        )
        base.update(kw)
        return Message(**base)  # type: ignore[arg-type]

    a1 = _inbound(
        thread_a,
        s3_key="demo-a-1",
        subject=thread_a.subject,
        body_text=(
            "Hi — I'm under contract on a 1985 Catalina 30 berthed in Annapolis and need a "
            "pre-purchase survey before the financing deadline next month. What's your earliest availability?"
        ),
        from_email="mark.peterson@example.com",
        from_name="Mark Peterson",
    )

    b1 = _inbound(
        thread_b,
        s3_key="demo-b-1",
        subject=thread_b.subject,
        body_text=(
            "Confirming you're set for the haul-out at Bert Jabin's next Tuesday at 9am. "
            "Anything you need from us beforehand?"
        ),
        from_email="james.whitfield@example.com",
        from_name="James Whitfield",
        read_at=now - timedelta(days=2),
    )
    b2 = _outbound(
        thread_b,
        subject=f"Re: {thread_b.subject}",
        body_text=(
            "All set — please have the yard pull her on stands by 8:30 and I'll be there at 9 with the moisture meter."
        ),
        to_emails=["james.whitfield@example.com"],
    )
    b3 = _inbound(
        thread_b,
        s3_key="demo-b-3",
        subject=f"Re: {thread_b.subject}",
        body_text="Sounds good, see you then.",
        from_email="james.whitfield@example.com",
        from_name="James Whitfield",
        read_at=now - timedelta(days=1),
    )

    c1 = _outbound(
        thread_c,
        subject="Survey Report attached",
        body_text="Hi James and Sarah — final survey report attached. Let me know if any questions come up.",
        to_emails=["james.whitfield@example.com"],
    )
    c2 = _inbound(
        thread_c,
        s3_key="demo-c-2",
        subject="Re: Survey Report attached",
        body_text=(
            "Thanks Alex. Quick question — page 12 lists engine hours as 'approx 1,200.' "
            "Is that owner-reported or measured? Our lender is asking."
        ),
        from_email="james.whitfield@example.com",
        from_name="James Whitfield",
    )

    d1 = _outbound(
        thread_d,
        subject=thread_d.subject,
        body_text=(
            "Hi — wanted to confirm the binder language we discussed last week. "
            "Could you send the latest template when you have a minute?"
        ),
        to_emails=["claims@bluewatermarine.example.com"],
    )

    e1 = _inbound(
        thread_e,
        s3_key="demo-e-1",
        subject=thread_e.subject,
        body_text="Thanks for the survey last fall. All resolved with insurance, closing this loop.",
        from_email="archive.client@example.com",
        from_name="Past Client",
        read_at=now - timedelta(days=125),
        archived_at=now - timedelta(days=120),
    )

    timeline = [
        (a1, now - timedelta(hours=3)),
        (b1, now - timedelta(days=3)),
        (b2, now - timedelta(days=3, hours=-2)),
        (b3, now - timedelta(days=2)),
        (c1, now - timedelta(days=5)),
        (c2, now - timedelta(hours=20)),
        (d1, now - timedelta(days=1)),
        (e1, now - timedelta(days=130)),
    ]
    for msg, ts in timeline:
        session.add(msg)
        msg.created_at = ts
        if msg.direction == MessageDirection.IN:
            msg.received_at = ts
            msg.processed_at = ts
        else:
            msg.sent_at = ts
    await session.flush()
    logger.info("Created 5 email threads with %d messages", len(timeline))

    logger.info("Demo seed complete — org=%s", org.name)
    return org
