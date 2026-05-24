from pathlib import Path

from litestar import Request

from app.config import config
from app.platform.documents.service.pdfs import PdfService


async def provide_pdf_service(request: Request) -> PdfService:
    return PdfService(Path(config.PDF_TEMPLATES_DIR))
