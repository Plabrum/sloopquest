from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.onboarding.enums import OnboardingState
from app.platform.base.models import BaseDBModel
from app.platform.state_machine.models import StateMachineMixin
from app.utils.sqids import Sqid, SqidType


class Onboarding(
    StateMachineMixin(state_enum=OnboardingState, initial_state=OnboardingState.NOT_STARTED),
    BaseDBModel,
):
    __tablename__ = "onboardings"
    __table_args__ = (sa.Index("ix_onboardings_user_id", "user_id", unique=True),)

    user_id: Mapped[Sqid] = mapped_column(
        SqidType,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
