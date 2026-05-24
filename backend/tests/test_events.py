"""Unit tests for the events framework."""
# pyright: reportArgumentType=false

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.platform.events.enums import EventType
from app.platform.events.models import Event
from app.platform.events.registry import (
    EventConsumerRegistry,
    async_event_consumer,
    consumer_key,
    event_consumer,
    get_registry_singleton,
    trigger_consumers,
)
from app.platform.events.schemas import (
    CreatedEventData,
    FieldChange,
    UpdatedEventData,
    make_field_changes,
)
from app.platform.events.service import emit_event
from app.utils.sqids import Sqid


@pytest.fixture(autouse=True)
def reset_registry() -> Generator[None]:
    """Each test gets a fresh consumer registry."""
    EventConsumerRegistry._instance = None
    reg = EventConsumerRegistry()
    reg._registry.clear()
    yield
    reg._registry.clear()


@pytest.fixture
def session() -> MagicMock:
    s = MagicMock()
    s.flush = AsyncMock()
    return s


class FakeWidget:
    __tablename__ = "widgets"

    def __init__(self, widget_id: int = 1) -> None:
        self.id = widget_id


def test_make_field_changes_diffs_only_changed() -> None:
    old = {"name": "A", "status": "draft", "count": 1}
    new = {"name": "B", "status": "draft", "count": 2}
    changes = make_field_changes(old, new)
    assert set(changes) == {"name", "count"}
    assert changes["name"] == FieldChange(old="A", new="B")
    assert changes["count"] == FieldChange(old=1, new=2)


async def test_emit_event_persists_event_and_runs_sync_consumer(session: MagicMock) -> None:
    seen: list[Event] = []

    @event_consumer(EventType.CREATED, model=FakeWidget)
    async def on_created(session, event, obj) -> None:  # noqa: ARG001
        seen.append(event)

    obj = FakeWidget()
    event = await emit_event(
        session=session,
        event_type=EventType.CREATED,
        obj=obj,
        user_id=42,
        org_id=7,
        event_data=CreatedEventData(initial_values={"name": "x"}),
    )

    session.add.assert_called_once_with(event)
    assert event.event_type == EventType.CREATED
    assert event.actor_id == 42
    assert event.organization_id == 7
    assert event.event_data == {"initial_values": {"name": "x"}}
    assert len(seen) == 1


async def test_consumer_filtered_by_model(session: MagicMock) -> None:
    class FakeOther:
        __tablename__ = "others"
        id = 1

    fired: list[str] = []

    @event_consumer(EventType.UPDATED, model=FakeWidget)
    async def widget_only(session, event, obj) -> None:  # noqa: ARG001
        fired.append("widget")

    await emit_event(
        session=session,
        event_type=EventType.UPDATED,
        obj=FakeOther(),  # type: ignore[arg-type]
        user_id=1,
        org_id=1,
    )
    assert fired == []

    await emit_event(
        session=session,
        event_type=EventType.UPDATED,
        obj=FakeWidget(),
        user_id=1,
        org_id=1,
    )
    assert fired == ["widget"]


async def test_payload_filter_callable(session: MagicMock) -> None:
    fired: list[Event] = []

    @event_consumer(
        EventType.UPDATED,
        model=FakeWidget,
        filter=lambda e: bool(e.event_data and e.event_data.get("changes", {}).get("status")),
    )
    async def status_only(session, event, obj) -> None:  # noqa: ARG001
        fired.append(event)

    await emit_event(
        session=session,
        event_type=EventType.UPDATED,
        obj=FakeWidget(),
        user_id=1,
        org_id=1,
        event_data=UpdatedEventData(changes={"name": FieldChange(old="a", new="b")}),
    )
    assert fired == []

    await emit_event(
        session=session,
        event_type=EventType.UPDATED,
        obj=FakeWidget(),
        user_id=1,
        org_id=1,
        event_data=UpdatedEventData(changes={"status": FieldChange(old="draft", new="active")}),
    )
    assert len(fired) == 1


async def test_consumer_without_channels_runs_when_channels_absent(session: MagicMock) -> None:
    """A sync consumer without `channels` in its signature must work even when
    no ChannelsPlugin is provided to emit_event."""
    fired: list[Event] = []

    @event_consumer(EventType.CREATED, model=FakeWidget)
    async def no_channels(session, event, obj) -> None:  # noqa: ARG001
        fired.append(event)

    await emit_event(
        session=session,
        event_type=EventType.CREATED,
        obj=FakeWidget(),
        user_id=1,
        org_id=1,
    )
    assert len(fired) == 1


async def test_consumer_requesting_channels_skipped_without_channels(session: MagicMock) -> None:
    """A consumer that requests `channels` in its signature is skipped (logged
    warning) when emit_event is called without a ChannelsPlugin — it does not
    blow up the emitter."""
    fired: list[Event] = []

    @event_consumer(EventType.CREATED, model=FakeWidget)
    async def needs_channels(session, event, obj, channels) -> None:  # noqa: ARG001
        fired.append(event)

    await emit_event(
        session=session,
        event_type=EventType.CREATED,
        obj=FakeWidget(),
        user_id=1,
        org_id=1,
    )
    assert fired == []


async def test_async_consumer_dispatches_via_handler(session: MagicMock) -> None:
    @async_event_consumer(EventType.CREATED, model=FakeWidget)
    async def slow_consumer(session, event, obj) -> None:  # noqa: ARG001
        raise AssertionError("async consumer should not run inline")

    dispatched: list[tuple[str, int]] = []

    async def fake_dispatch(key: str, event_id: int) -> None:
        dispatched.append((key, event_id))

    obj = FakeWidget()
    event = Event(
        actor_id=1,
        organization_id=1,
        object_type=obj.__tablename__,
        object_id=obj.id,
        event_type=EventType.CREATED,
        event_data=None,
    )
    event.id = Sqid(99)

    await trigger_consumers(session, event, obj, dispatch_async=fake_dispatch)
    assert dispatched == [(consumer_key(slow_consumer), 99)]


def test_consumer_key_lookup_round_trips() -> None:
    @async_event_consumer(EventType.CUSTOM, model=FakeWidget)
    async def my_consumer(session, event, obj) -> None:  # noqa: ARG001
        pass

    reg = get_registry_singleton().lookup_by_key(consumer_key(my_consumer))
    assert reg is not None
    assert reg.is_async is True
    assert reg.consumer is my_consumer
