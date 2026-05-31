"""Extraction-platform unit tests.

No live LLM. The structured-output path is exercised by monkey-patching the
anthropic client factory; the framework tree is exercised by calling `run()`
with hand-built schemas.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, ClassVar

import msgspec
import pytest
from msgspec import Struct
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.extraction.base import BaseExtractor
from app.platform.extraction.types import Document, ExtractionError
from app.platform.llm import extract as extract_mod

# ── fixtures ─────────────────────────────────────────────────────────────────


@dataclass
class _FakeModel:
    name: str
    parent_name: str | None = None


class _ParentSchema(Struct):
    name: str


class _ChildSchema(Struct):
    name: str
    parent: _ParentSchema | None = None


class _ParentExtractor(BaseExtractor[_ParentSchema, Any]):
    schema = _ParentSchema
    model = _FakeModel

    created: ClassVar[list[str]] = []
    lookup_returns: ClassVar[dict[str, _FakeModel]] = {}

    @classmethod
    async def lookup(cls, transaction: AsyncSession, data: _ParentSchema) -> _FakeModel | None:
        return cls.lookup_returns.get(data.name)

    @classmethod
    async def create(cls, transaction: AsyncSession, data: _ParentSchema) -> _FakeModel:
        cls.created.append(data.name)
        return _FakeModel(name=data.name)


class _ChildExtractor(BaseExtractor[_ChildSchema, Any]):
    schema = _ChildSchema
    model = _FakeModel

    created: ClassVar[list[str]] = []

    @classmethod
    async def create(cls, transaction: AsyncSession, data: _ChildSchema) -> _FakeModel:
        parent = await _ParentExtractor.run(transaction, data.parent) if data.parent else None
        cls.created.append(data.name)
        return _FakeModel(name=data.name, parent_name=parent.name if parent else None)


@pytest.fixture(autouse=True)
def _reset_test_extractor_state():
    _ParentExtractor.created.clear()
    _ParentExtractor.lookup_returns.clear()
    _ChildExtractor.created.clear()
    yield


# ── BaseExtractor.run ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_creates_when_lookup_misses():
    result = await _ParentExtractor.run(None, _ParentSchema(name="acme"))  # type: ignore[arg-type]
    assert result.name == "acme"
    assert _ParentExtractor.created == ["acme"]


@pytest.mark.asyncio
async def test_run_short_circuits_on_lookup_hit():
    existing = _FakeModel(name="acme")
    _ParentExtractor.lookup_returns["acme"] = existing
    result = await _ParentExtractor.run(None, _ParentSchema(name="acme"))  # type: ignore[arg-type]
    assert result is existing
    assert _ParentExtractor.created == []


@pytest.mark.asyncio
async def test_child_composition_via_attribute_access():
    data = _ChildSchema(name="boat", parent=_ParentSchema(name="builder"))
    result = await _ChildExtractor.run(None, data)  # type: ignore[arg-type]
    assert result.name == "boat"
    assert result.parent_name == "builder"
    assert _ParentExtractor.created == ["builder"]


@pytest.mark.asyncio
async def test_child_without_optional_parent():
    data = _ChildSchema(name="boat", parent=None)
    result = await _ChildExtractor.run(None, data)  # type: ignore[arg-type]
    assert result.parent_name is None
    assert _ParentExtractor.created == []


# ── Document ─────────────────────────────────────────────────────────────────


def test_document_constructors():
    assert Document.from_text("hi").mime == "text/plain"
    assert Document.from_pdf(b"%PDF-1.4...").mime == "application/pdf"
    assert Document.from_image(b"\x89PNG").mime == "image/png"
    assert Document.from_image(b"...", mime="image/jpeg").mime == "image/jpeg"


# ── llm_extract: schema-component inlining ───────────────────────────────────


class _InnerForSchemaTest(Struct):
    name: str


class _OuterForSchemaTest(Struct):
    title: str
    inner: _InnerForSchemaTest | None = None


def test_schema_to_json_schema_inlines_refs():
    schema = extract_mod._schema_to_json_schema(_OuterForSchemaTest)
    assert schema["type"] == "object"
    # Inner is inlined, no leftover $ref
    serialized = msgspec.json.encode(schema).decode()
    assert "$ref" not in serialized
    assert "$defs" not in serialized


# ── llm_extract: monkey-patched anthropic client ─────────────────────────────


class _FakeBlock:
    def __init__(self, type_: str, name: str, input_: dict) -> None:
        self.type = type_
        self.name = name
        self.input = input_


class _FakeResponse:
    def __init__(self, blocks: list[_FakeBlock]) -> None:
        self.content = blocks


class _FakeMessages:
    def __init__(self, responses: list[_FakeResponse]) -> None:
        self._responses = list(responses)
        self.calls: list[dict] = []

    async def create(self, **kwargs: Any) -> _FakeResponse:
        self.calls.append(kwargs)
        return self._responses.pop(0)


class _FakeAnthropic:
    def __init__(self, responses: list[_FakeResponse]) -> None:
        self.messages = _FakeMessages(responses)


@pytest.fixture
def use_real_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(extract_mod.config, "USE_REAL_LLM", True)


class _Thing(Struct):
    name: str
    count: int


class _OneField(Struct):
    name: str


@pytest.mark.asyncio
async def test_llm_extract_returns_decoded_struct(monkeypatch: pytest.MonkeyPatch, use_real_llm: None):
    fake = _FakeAnthropic([_FakeResponse([_FakeBlock("tool_use", "extract", {"name": "x", "count": 7})])])
    monkeypatch.setattr(extract_mod, "_client", lambda: fake)

    result = await extract_mod.llm_extract(Document.from_text("doc"), schema=_Thing, prompt="extract it")
    assert result == _Thing(name="x", count=7)
    assert len(fake.messages.calls) == 1


@pytest.mark.asyncio
async def test_llm_extract_retries_on_invalid_schema(monkeypatch: pytest.MonkeyPatch, use_real_llm: None):
    fake = _FakeAnthropic(
        [
            _FakeResponse([_FakeBlock("tool_use", "extract", {"name": "x"})]),  # missing count
            _FakeResponse([_FakeBlock("tool_use", "extract", {"name": "x", "count": 3})]),
        ]
    )
    monkeypatch.setattr(extract_mod, "_client", lambda: fake)

    result = await extract_mod.llm_extract(Document.from_text("doc"), schema=_Thing, prompt="extract it")
    assert result.count == 3
    assert len(fake.messages.calls) == 2


@pytest.mark.asyncio
async def test_llm_extract_raises_after_retries(monkeypatch: pytest.MonkeyPatch, use_real_llm: None):
    fake = _FakeAnthropic(
        [
            _FakeResponse([_FakeBlock("tool_use", "extract", {})]),
            _FakeResponse([_FakeBlock("tool_use", "extract", {})]),
        ]
    )
    monkeypatch.setattr(extract_mod, "_client", lambda: fake)

    with pytest.raises(ExtractionError):
        await extract_mod.llm_extract(Document.from_text("doc"), schema=_OneField, prompt="extract it")


@pytest.mark.asyncio
async def test_llm_extract_disabled_when_use_real_llm_false(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(extract_mod.config, "USE_REAL_LLM", False)
    with pytest.raises(ExtractionError):
        await extract_mod.llm_extract(Document.from_text("doc"), schema=_OneField, prompt="extract it")
