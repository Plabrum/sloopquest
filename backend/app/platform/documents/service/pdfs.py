import asyncio
import json
from asyncio.subprocess import PIPE
from pathlib import Path


class PdfRenderError(Exception):
    pass


class PdfService:
    def __init__(self, pdf_templates_dir: Path) -> None:
        self.pdf_templates_dir = pdf_templates_dir

    async def render_pdf(self, template_name: str, context: dict) -> bytes:
        bundle = self.pdf_templates_dir / template_name / "render.js"
        if not bundle.exists():
            raise PdfRenderError(f"PDF bundle not found: {bundle}")

        proc = await asyncio.create_subprocess_exec(
            "node",
            str(bundle),
            stdin=PIPE,
            stdout=PIPE,
            stderr=PIPE,
        )
        stdout, stderr = await proc.communicate(json.dumps(context).encode())
        if proc.returncode != 0:
            raise PdfRenderError(stderr.decode())
        return stdout

    async def render_survey_report(
        self,
        vessel_name: str,
        vessel_type: str,
        surveyor_name: str,
        company_name: str,
        company_address: str,
        client_name: str,
        survey_date: str,
        cover_photo_url: str,
        sections: list[dict],
    ) -> bytes:
        return await self.render_pdf(
            "survey_report",
            {
                "vessel_name": vessel_name,
                "vessel_type": vessel_type,
                "surveyor_name": surveyor_name,
                "company_name": company_name,
                "company_address": company_address,
                "client_name": client_name,
                "survey_date": survey_date,
                "cover_photo_url": cover_photo_url,
                "sections": sections,
            },
        )
