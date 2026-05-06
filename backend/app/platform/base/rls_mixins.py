from typing import Any

import sqlalchemy as sa
from alembic_utils.pg_policy import PGPolicy
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel

# Global registry for RLS policies — consumed by alembic env.py
RLS_POLICY_REGISTRY: list[PGPolicy] = []

# ── Policy SQL templates ─────────────────────────────────────────────────────
#
# The active user is communicated to Postgres via the session variable
# `app.user_id` (set by `@with_transaction` in the queue layer and by a
# Litestar middleware for request handlers). `app.is_system_mode` bypasses
# RLS for trusted internal flows (migrations, system jobs).
#
# TODO: rewrite policy SQL for sloopquest scope hierarchy
# Once the sloopquest scope hierarchy (org → vessel → survey, or similar) is
# decided, the policy bodies below need to be rewritten to enforce that
# hierarchy. The current bodies are placeholders that only check the system
# mode escape hatch and the presence of a user id — they do NOT enforce
# any membership relation.


# TODO: rewrite policy SQL for sloopquest scope hierarchy
ORG_ROOT_POLICY = """
    AS PERMISSIVE
    FOR ALL
    USING (
        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE
        OR NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
    )
"""


def org_child_policy(table: str) -> str:
    """Build the org-scoped child-table RLS policy with qualified columns.

    Unqualified column references inside subqueries can silently resolve to
    the subquery's own FROM, making the condition a self-comparison. Every
    child-table policy must prefix `{table}.<column>` references.
    """
    # TODO: rewrite policy SQL for sloopquest scope hierarchy
    return f"""
    AS PERMISSIVE
    FOR ALL
    USING (
        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE
        OR (
            NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
            AND {table}.id IS NOT NULL
        )
    )
"""


USER_SCOPED_POLICY = """
    AS PERMISSIVE
    FOR ALL
    USING (
        NULLIF(current_setting('app.is_system_mode', true), '')::boolean IS TRUE
        OR (NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
            AND user_id = NULLIF(current_setting('app.user_id', true), '')::int)
    )
"""


# ── Mixins ───────────────────────────────────────────────────────────────────


class OrgRootMixin:
    """Applied only to the top-level org-scope model (e.g. Org).

    Uses the table's own id as the scope identifier.
    """

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        if not hasattr(cls, "__tablename__"):
            return

        tablename: str = cls.__tablename__  # type: ignore[misc]

        # Register table for RLS enablement (used by comparator)
        BaseDBModel.metadata.info.setdefault("rls", set()).add(tablename)

        RLS_POLICY_REGISTRY.append(
            PGPolicy(
                schema="public",
                signature="org_scope_policy",
                on_entity=f"public.{tablename}",
                definition=ORG_ROOT_POLICY,
            )
        )


class UserScopedMixin:
    """Applied to tables where rows belong to a single user (e.g. LLM threads).

    Does NOT add columns — the model must define its own user_id FK.
    Registers a user-scoped RLS policy: only the owning user (or system mode)
    can access rows.
    """

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        if not hasattr(cls, "__tablename__"):
            return

        tablename: str = cls.__tablename__  # type: ignore[misc]

        BaseDBModel.metadata.info.setdefault("rls", set()).add(tablename)

        RLS_POLICY_REGISTRY.append(
            PGPolicy(
                schema="public",
                signature="user_scope_policy",
                on_entity=f"public.{tablename}",
                definition=USER_SCOPED_POLICY,
            )
        )


class OrgScopedMixin:
    """Applied to all child org-scoped data tables. Adds an organization_id FK."""

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        if not hasattr(cls, "__tablename__"):
            return

        tablename: str = cls.__tablename__  # type: ignore[misc]

        BaseDBModel.metadata.info.setdefault("rls", set()).add(tablename)

        RLS_POLICY_REGISTRY.append(
            PGPolicy(
                schema="public",
                signature="org_scope_policy",
                on_entity=f"public.{tablename}",
                definition=org_child_policy(tablename),
            )
        )
