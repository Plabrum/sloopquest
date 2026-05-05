"""State machine dependency providers."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.state_machine.machine import StateMachineService
from app.utils.deps import dep


@dep("sm_service")
def provide_sm_service(db_session: AsyncSession) -> StateMachineService:
    return StateMachineService(db_session)
