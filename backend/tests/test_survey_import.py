"""End-to-end tests for the survey import pipeline."""

from __future__ import annotations

from email.message import EmailMessage

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.extractor import ClientExtractor, ClientSchema
from app.domain.clients.operations import create_individual_client
from app.domain.manufacturers.extractor import ManufacturerSchema
from app.domain.surveys.enums import SurveySource
from app.domain.surveys.extractor import (
    SurveyTemplateExtractor,
    TemplateSchema,
    TemplateSectionSchema,
)
from app.domain.surveys.survey_extractor import SurveyExtractor, SurveySchema
from app.domain.surveys.tasks import _extract_pdf_attachments
from app.domain.vessels.extractor import VesselSchema

# ── ClientExtractor ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_client_extractor_creates_individual(transaction: AsyncSession):
    client = await ClientExtractor.run(
        transaction,
        ClientSchema(name="Alice Skipper", email="alice@example.com", phone="555-0100"),
    )
    assert client.email == "alice@example.com"
    assert client.first_name == "Alice"
    assert client.last_name == "Skipper"


@pytest.mark.asyncio
async def test_client_extractor_matches_by_email(transaction: AsyncSession):
    existing = await create_individual_client(transaction, display_name="Bob Sailor", email="bob@example.com")
    result = await ClientExtractor.run(
        transaction,
        ClientSchema(name="Different Name", email="BOB@example.com"),
    )
    assert result.id == existing.id


@pytest.mark.asyncio
async def test_client_extractor_matches_by_display_name(transaction: AsyncSession):
    existing = await create_individual_client(transaction, display_name="Carol Mariner")
    result = await ClientExtractor.run(transaction, ClientSchema(name="carol mariner"))
    assert result.id == existing.id


# ── SurveyTemplateExtractor (create path; lookup needs embeddings) ───────────


@pytest.mark.asyncio
async def test_survey_template_extractor_creates(transaction: AsyncSession):
    template = await SurveyTemplateExtractor.create(
        transaction,
        TemplateSchema(
            name="MyTemplate",
            sections=[
                TemplateSectionSchema(name="Hull", field_names=["Material", "Condition"]),
                TemplateSectionSchema(name="Engine", field_names=["Hours"]),
            ],
        ),
    )
    assert template.name == "MyTemplate"
    section_titles = [s["title"] for s in template.definition["sections"]]
    assert section_titles == ["Hull", "Engine"]
    field_labels = [f["label"] for f in template.definition["sections"][0]["fields"]]
    assert field_labels == ["Material", "Condition"]


# ── SurveyExtractor end-to-end (no LLM) ──────────────────────────────────────


@pytest.mark.asyncio
async def test_survey_extractor_run_persists_imported_survey(transaction: AsyncSession):
    data = SurveySchema(
        client=ClientSchema(name="Dana Boatowner", email="dana@example.com"),
        vessel=VesselSchema(
            name="Argonaut",
            hin="ARGO00001A101",
            manufacturer=ManufacturerSchema(name="Catalina"),
        ),
        template=TemplateSchema(
            name="Marine Pre-Purchase",
            sections=[TemplateSectionSchema(name="Hull", field_names=["Material"])],
        ),
        responses=[],
        surveyor="Captain Test",
    )
    survey = await SurveyExtractor.create(transaction, data)
    assert survey.id is not None
    assert survey.source == SurveySource.IMPORTED
    assert survey.vessel_id is not None
    assert survey.template_id is not None


# ── PDF-attachment parser ────────────────────────────────────────────────────


def test_extract_pdf_attachments_picks_pdfs():
    msg = EmailMessage()
    msg["From"] = "user@example.com"
    msg["To"] = "surveys@sloopquest.local"
    msg.set_content("body")
    msg.add_attachment(b"%PDF-1.4 hello", maintype="application", subtype="pdf", filename="a.pdf")
    msg.add_attachment(b"plain text", maintype="text", subtype="plain", filename="notes.txt")
    msg.add_attachment(b"%PDF-1.4 second", maintype="application", subtype="pdf", filename="b.pdf")
    parsed = _extract_pdf_attachments(msg)
    filenames = sorted(name for name, _ in parsed)
    assert filenames == ["a.pdf", "b.pdf"]
    assert all(data.startswith(b"%PDF") for _, data in parsed)


def test_extract_pdf_attachments_filename_fallback():
    """An attachment with .pdf filename but wrong content-type still counts."""
    msg = EmailMessage()
    msg.set_content("body")
    msg.add_attachment(b"%PDF-1.4 data", maintype="application", subtype="octet-stream", filename="survey.pdf")
    parsed = _extract_pdf_attachments(msg)
    assert [name for name, _ in parsed] == ["survey.pdf"]


def test_extract_pdf_attachments_ignores_non_pdfs():
    msg = EmailMessage()
    msg.set_content("body")
    msg.add_attachment(b"plain text", maintype="text", subtype="plain", filename="notes.txt")
    assert _extract_pdf_attachments(msg) == []
