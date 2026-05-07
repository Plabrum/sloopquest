"""Typed dependencies for actions."""

from dataclasses import dataclass

from litestar import Request
from litestar_saq import TaskQueues
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Config, config
from app.domain.users.models import User
from app.platform.actions.registry import ActionRegistry
from app.platform.billing.service import BillingService
from app.platform.state_machine.machine import StateMachineService
from app.utils.deps import dep


@dataclass
class ActionDeps:
    """Typed dependencies available to all actions."""

    user: User
    request: Request
    transaction: AsyncSession
    config: Config
    task_queues: TaskQueues
    sm_service: StateMachineService
    billing: BillingService


@dep("action_registry", sync_to_thread=False)
def provide_action_registry(
    db_session: AsyncSession,
    request: Request,
    billing_service: BillingService,
) -> ActionRegistry:
    user = request.user if request.user else None
    task_queues = request.app.state.task_queues
    return ActionRegistry(
        transaction=db_session,
        config=config,
        request=request,
        user=user,
        task_queues=task_queues,
        sm_service=StateMachineService(db_session),
        billing=billing_service,
    )
