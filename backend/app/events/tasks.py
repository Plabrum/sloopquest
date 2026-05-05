"""SAQ task for running async event consumers out-of-process."""

from __future__ import annotations

import logging
import traceback

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.base.models import BaseDBModel
from app.events.models import Event, EventConsumerFailure
from app.events.registry import _invoke_consumer, get_registry_singleton
from app.queue.enums import TaskName
from app.queue.exceptions import CommittableTaskError
from app.queue.registry import task
from app.queue.transactions import with_transaction
from app.queue.types import AppContext

logger = logging.getLogger(__name__)


class EventConsumerFailedError(CommittableTaskError):
    """Raised by RUN_EVENT_CONSUMER after persisting a failure row.

    The CommittableTaskError parent ensures the failure row is committed so
    SAQ retry attempts can see prior failures, mirroring the pattern used
    elsewhere in the queue layer.
    """


@task(TaskName.RUN_EVENT_CONSUMER)
@with_transaction
async def run_event_consumer(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    consumer_key: str,
    event_id: int,
) -> None:
    """Resolve the consumer by key, load the Event + obj, and invoke it.

    On failure, persist an `EventConsumerFailure` row, then raise
    `EventConsumerFailed` (a CommittableTaskError) so the failure record
    survives transaction commit and SAQ can retry.
    """
    registration = get_registry_singleton().lookup_by_key(consumer_key)
    if registration is None:
        logger.error("No consumer registered for key %r — dropping event %s", consumer_key, event_id)
        return

    event = await transaction.get(Event, event_id)
    if event is None:
        logger.error("Event %s not found — dropping consumer %r", event_id, consumer_key)
        return

    obj = await _load_object(transaction, event)
    if obj is None:
        logger.warning(
            "Source object for event %s (%s#%s) not found — dropping consumer %r",
            event_id,
            event.object_type,
            event.object_id,
            consumer_key,
        )
        return

    try:
        await _invoke_consumer(registration.consumer, transaction, event, obj, dependencies={})
    except Exception as exc:
        await _record_failure(transaction, event_id, consumer_key, exc)
        raise EventConsumerFailedError(f"{consumer_key} failed for event {event_id}") from exc


async def _load_object(transaction: AsyncSession, event: Event):
    """Resolve the source object referenced by the event, or None if missing."""
    target_cls = next(
        (m for m in BaseDBModel.get_all_models() if m.__tablename__ == event.object_type),
        None,
    )
    if target_cls is None:
        logger.warning("Unknown object_type %r in event %s", event.object_type, event.id)
        return None
    return await transaction.get(target_cls, event.object_id)


async def _record_failure(
    transaction: AsyncSession,
    event_id: int,
    consumer_key: str,
    exc: BaseException,
) -> None:
    prior = await transaction.execute(
        select(EventConsumerFailure)
        .where(EventConsumerFailure.event_id == event_id)
        .where(EventConsumerFailure.consumer_key == consumer_key)
    )
    attempts = len(prior.scalars().all()) + 1
    transaction.add(
        EventConsumerFailure(
            event_id=event_id,
            consumer_key=consumer_key,
            attempt=attempts,
            error="".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[:8000],
        )
    )
    await transaction.flush()
