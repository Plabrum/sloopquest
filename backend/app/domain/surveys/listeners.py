"""Session listeners for the surveys domain.

When a `FormNode` is soft-deleted (its `deleted_at` transitions from NULL to a
value), any `survey_media` rows pointing at it must have `node_id` cleared so
the photo returns to the Unassigned bucket instead of vanishing along with the
filtered-out node.

The DB-level `ON DELETE SET NULL` only fires on hard delete, so we mirror it
for soft delete via a `before_flush` listener.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy import event, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.domain.surveys.models import SurveyMedia
from app.platform.form_dsl.models import FormNode


def _detach_media_from_soft_deleted_nodes(session: Session, flush_context, instances) -> None:
    soft_deleted_node_ids: list = []
    for obj in session.dirty:
        if not isinstance(obj, FormNode):
            continue
        hist = inspect(obj).attrs.deleted_at.history
        if hist.has_changes() and obj.deleted_at is not None:
            soft_deleted_node_ids.append(obj.id)

    if not soft_deleted_node_ids:
        return

    session.execute(sa.update(SurveyMedia).where(SurveyMedia.node_id.in_(soft_deleted_node_ids)).values(node_id=None))


def install_survey_media_node_detach_listener() -> None:
    event.listen(AsyncSession.sync_session_class, "before_flush", _detach_media_from_soft_deleted_nodes)
