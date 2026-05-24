from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import OrgScopedMixin
from app.platform.sequences.enums import SequenceType
from app.utils.textenum import TextEnum


class BusinessSequence(OrgScopedMixin, BaseDBModel):
    __tablename__ = "business_sequences"
    __table_args__ = (sa.UniqueConstraint("organization_id", "type", name="uq_business_sequences_org_type"),)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    type: Mapped[SequenceType] = mapped_column(TextEnum(SequenceType), nullable=False)
    current_value: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
