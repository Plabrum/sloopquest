from __future__ import annotations

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.addresses.models import Address
from app.domain.manufacturers.models import Manufacturer
from app.domain.vessels.enums import (
    EnginePosition,
    EngineType,
    FuelType,
    HullMaterial,
    PropulsionType,
    RiggingType,
    VesselType,
)
from app.platform.base.models import BaseDBModel, TimestampMixin
from app.utils.sqids import Sqid, SqidType
from app.utils.textenum import TextEnum


class Vessel(TimestampMixin, BaseDBModel):
    __tablename__ = "vessels"

    name: Mapped[str] = mapped_column(sa.Text)
    hin: Mapped[str | None] = mapped_column(sa.Text, index=True)
    uscg_official_number: Mapped[str | None] = mapped_column(sa.Text)
    state_registration_number: Mapped[str | None] = mapped_column(sa.Text)

    manufacturer_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("manufacturers.id", ondelete="SET NULL"),
        index=True,
    )
    manufacturer: Mapped[Manufacturer | None] = relationship(
        "Manufacturer",
        foreign_keys=[manufacturer_id],
        lazy="raise",
    )
    model: Mapped[str | None] = mapped_column(sa.Text)
    year_built: Mapped[int | None] = mapped_column(sa.Integer)
    vessel_type: Mapped[VesselType | None] = mapped_column(TextEnum(VesselType))
    propulsion_type: Mapped[PropulsionType | None] = mapped_column(TextEnum(PropulsionType))
    rigging_type: Mapped[RiggingType | None] = mapped_column(TextEnum(RiggingType))

    loa_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    beam_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    draft_ft: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 2))
    displacement_lbs: Mapped[Decimal | None] = mapped_column(sa.Numeric(8, 2))
    fuel_capacity_gal: Mapped[Decimal | None] = mapped_column(sa.Numeric(8, 2))

    hull_material: Mapped[HullMaterial | None] = mapped_column(TextEnum(HullMaterial))
    construction_notes: Mapped[str | None] = mapped_column(sa.Text)

    organization_id: Mapped[int] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    home_port_address_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("addresses.id", ondelete="SET NULL"),
        index=True,
    )

    home_port_address: Mapped[Address | None] = relationship(
        "Address",
        foreign_keys=[home_port_address_id],
        lazy="raise",
    )
    engines: Mapped[list[Engine]] = relationship(
        "Engine",
        back_populates="vessel",
        cascade="all, delete-orphan",
        lazy="noload",
    )


class Engine(BaseDBModel):
    __tablename__ = "engines"

    vessel_id: Mapped[int] = mapped_column(
        sa.ForeignKey("vessels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[EnginePosition] = mapped_column(TextEnum(EnginePosition), nullable=False)
    manufacturer_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("manufacturers.id", ondelete="SET NULL"),
        index=True,
    )
    manufacturer: Mapped[Manufacturer | None] = relationship(
        "Manufacturer",
        foreign_keys=[manufacturer_id],
        lazy="raise",
    )
    model: Mapped[str | None] = mapped_column(sa.Text)
    serial_number: Mapped[str | None] = mapped_column(sa.Text)
    year: Mapped[int | None] = mapped_column(sa.Integer)
    horsepower: Mapped[int | None] = mapped_column(sa.Integer)
    fuel_type: Mapped[FuelType | None] = mapped_column(TextEnum(FuelType))
    engine_type: Mapped[EngineType | None] = mapped_column(TextEnum(EngineType))
    hours_at_survey: Mapped[int | None] = mapped_column(sa.Integer)

    vessel: Mapped[Vessel] = relationship("Vessel", back_populates="engines", lazy="raise")
