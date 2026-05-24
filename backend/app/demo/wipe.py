"""Wipe all data belonging to the demo organization.

Deletes in FK-safe order so no constraint violations occur.
"""

import logging

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import Organization

logger = logging.getLogger(__name__)

DEMO_ORG_NAME = "Sloopquest Demo"
DEMO_ORG_ID = 0


async def wipe_demo_org(session: AsyncSession) -> bool:
    """Delete all data for the demo org. Returns True if org existed."""
    org = (await session.execute(select(Organization).where(Organization.id == DEMO_ORG_ID))).scalar_one_or_none()
    if org is None:
        logger.info("Demo org (id=%s) not found — nothing to wipe", DEMO_ORG_ID)
        return False

    logger.info("Wiping demo org %r (id=%s)", org.name, DEMO_ORG_ID)

    # Collect address IDs to clean up at the end (no organization_id column)
    addr_ids_result = await session.execute(
        text(
            "SELECT DISTINCT unnest(ARRAY["
            "  c.billing_address_id,"
            "  v.home_port_address_id,"
            "  o.address_id"
            "]) AS aid"
            " FROM organizations o"
            " LEFT JOIN clients c ON c.organization_id = o.id"
            " LEFT JOIN vessels v ON v.organization_id = o.id"
            " WHERE o.id = :oid"
        ),
        {"oid": DEMO_ORG_ID},
    )
    address_ids = [row[0] for row in addr_ids_result if row[0] is not None]

    # Collect IDs for state transition log cleanup
    for object_type in ("surveys", "reports", "subscriptions"):
        ids_result = await session.execute(
            text(f"SELECT id FROM {object_type} WHERE organization_id = :oid"),  # noqa: S608
            {"oid": DEMO_ORG_ID},
        )
        obj_ids = [row[0] for row in ids_result]
        if obj_ids:
            await session.execute(
                text("DELETE FROM state_transition_logs WHERE object_type = :otype AND object_id = ANY(:ids)"),
                {"otype": object_type, "ids": obj_ids},
            )
            logger.info("  Deleted transition logs for %s (%d objects)", object_type, len(obj_ids))

    # invoice_line_items reference invoices
    result = await session.execute(
        text(
            "DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE organization_id = :oid)"
        ),
        {"oid": DEMO_ORG_ID},
    )
    logger.info("  invoice_line_items: %d rows deleted", result.rowcount)  # pyright: ignore[reportAttributeAccessIssue]

    # engines reference vessels
    result = await session.execute(
        text("DELETE FROM engines WHERE vessel_id IN (SELECT id FROM vessels WHERE organization_id = :oid)"),
        {"oid": DEMO_ORG_ID},
    )
    logger.info("  engines: %d rows deleted", result.rowcount)  # pyright: ignore[reportAttributeAccessIssue]

    # Org-scoped tables (order matters: child rows before parents)
    for table in (
        "form_nodes",
        "survey_media",
        "media",
        "calendar_events",
        "events",
        "quote_line_items",
        "quotes",
        "pricing_tiers",
        "pricing_guides",
        "parts",
        "manufacturers",
        "payment_methods",
        "business_sequences",
        "invoices",
        "reports",
        "surveys",
        "survey_templates",
        "subscriptions",
        "vessels",
        "clients",
        "users",
    ):
        result = await session.execute(
            text(f"DELETE FROM {table} WHERE organization_id = :oid"),  # noqa: S608
            {"oid": DEMO_ORG_ID},
        )
        logger.info("  %s: %d rows deleted", table, result.rowcount)  # pyright: ignore[reportAttributeAccessIssue]

    await session.execute(delete(Organization).where(Organization.id == DEMO_ORG_ID))
    logger.info("  organizations: 1 row deleted")

    if address_ids:
        result = await session.execute(
            text("DELETE FROM addresses WHERE id = ANY(:ids)"),
            {"ids": address_ids},
        )
        logger.info("  addresses: %d rows deleted", result.rowcount)  # pyright: ignore[reportAttributeAccessIssue]

    return True
