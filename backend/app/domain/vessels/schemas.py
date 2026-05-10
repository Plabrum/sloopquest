from datetime import datetime
from decimal import Decimal

from app.domain.vessels.enums import (
    EnginePosition,
    EngineType,
    FuelType,
    HullMaterial,
    PropulsionType,
    RiggingType,
    VesselType,
)
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class EngineSchema(BaseSchema):
    id: Sqid
    position: EnginePosition
    manufacturer_id: Sqid | None
    model: str | None
    serial_number: str | None
    year: int | None
    horsepower: int | None
    fuel_type: FuelType | None
    engine_type: EngineType | None
    hours_at_survey: int | None
    created_at: datetime


class VesselListItem(BaseSchema):
    id: Sqid
    name: str
    vessel_type: VesselType | None
    propulsion_type: PropulsionType | None
    hull_material: HullMaterial | None
    year_built: int | None
    created_at: datetime


class VesselDetail(BaseSchema):
    id: Sqid
    name: str
    hin: str | None
    uscg_official_number: str | None
    state_registration_number: str | None
    manufacturer_id: Sqid | None
    model: str | None
    year_built: int | None
    vessel_type: VesselType | None
    propulsion_type: PropulsionType | None
    rigging_type: RiggingType | None
    loa_ft: Decimal | None
    beam_ft: Decimal | None
    draft_ft: Decimal | None
    displacement_lbs: Decimal | None
    fuel_capacity_gal: Decimal | None
    hull_material: HullMaterial | None
    construction_notes: str | None
    engines: list[EngineSchema]
    created_at: datetime
    updated_at: datetime


class VesselCreateData(BaseSchema):
    name: str
    hin: str | None = None
    uscg_official_number: str | None = None
    state_registration_number: str | None = None
    manufacturer_id: Sqid | None = None
    model: str | None = None
    year_built: int | None = None
    vessel_type: VesselType | None = None
    propulsion_type: PropulsionType | None = None
    rigging_type: RiggingType | None = None
    loa_ft: Decimal | None = None
    beam_ft: Decimal | None = None
    draft_ft: Decimal | None = None
    displacement_lbs: Decimal | None = None
    fuel_capacity_gal: Decimal | None = None
    hull_material: HullMaterial | None = None
    construction_notes: str | None = None


class VesselUpdateData(BaseSchema):
    name: str
    hin: str | None
    uscg_official_number: str | None
    state_registration_number: str | None
    manufacturer_id: Sqid | None
    model: str | None
    year_built: int | None
    vessel_type: VesselType | None
    propulsion_type: PropulsionType | None
    rigging_type: RiggingType | None
    loa_ft: Decimal | None
    beam_ft: Decimal | None
    draft_ft: Decimal | None
    displacement_lbs: Decimal | None
    fuel_capacity_gal: Decimal | None
    hull_material: HullMaterial | None
    construction_notes: str | None


class AddEngineData(BaseSchema):
    position: EnginePosition
    manufacturer_id: Sqid | None = None
    model: str | None = None
    serial_number: str | None = None
    year: int | None = None
    horsepower: int | None = None
    fuel_type: FuelType | None = None
    engine_type: EngineType | None = None
    hours_at_survey: int | None = None


class UpdateEngineData(BaseSchema):
    engine_id: Sqid
    position: EnginePosition
    manufacturer_id: Sqid | None
    model: str | None
    serial_number: str | None
    year: int | None
    horsepower: int | None
    fuel_type: FuelType | None
    engine_type: EngineType | None
    hours_at_survey: int | None


class RemoveEngineData(BaseSchema):
    engine_id: Sqid
