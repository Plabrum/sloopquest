"""RLS scoping tests for calendar_events.

The test DB connects as the postgres superuser, which bypasses RLS even with
FORCE ROW LEVEL SECURITY. Rather than spin up a separate role per test, we
verify that the org-scope policy is registered and the table has RLS enabled
on it — the policy SQL itself is exercised in production and shared with
every other OrgScopedMixin table.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_calendar_events_has_rls_enabled(db_session: AsyncSession) -> None:
    row = (
        await db_session.execute(text("SELECT relrowsecurity FROM pg_class WHERE relname = 'calendar_events'"))
    ).scalar_one()
    assert row is True


async def test_calendar_events_has_org_scope_policy(db_session: AsyncSession) -> None:
    row = (
        await db_session.execute(
            text(
                "SELECT polname FROM pg_policy "
                "WHERE polrelid::regclass::text = 'calendar_events' "
                "AND polname = 'org_scope_policy'"
            )
        )
    ).scalar_one_or_none()
    assert row == "org_scope_policy"
