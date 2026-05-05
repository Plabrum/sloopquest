from litestar import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.comms.service.emails import EmailService
from app.utils.deps import dep


@dep("email_service")
async def provide_email_service(request: Request, db_session: AsyncSession) -> EmailService:
    return EmailService(request.app.template_engine, db_session, request)  # type: ignore[arg-type]
