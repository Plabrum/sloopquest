from __future__ import annotations

from litestar import Router
from sqlalchemy.orm import selectinload

from app.domain.users.models import User
from app.domain.vessels.models import Engine, Vessel
from app.domain.vessels.schemas import EngineSchema, VesselDetail, VesselListItem
from app.platform.base.crud import CRUDConfig, make_crud_controller


def _to_engine(engine: Engine) -> EngineSchema:
    return EngineSchema(
        id=engine.id,
        position=engine.position,
        make=engine.make,
        model=engine.model,
        serial_number=engine.serial_number,
        year=engine.year,
        horsepower=engine.horsepower,
        fuel_type=engine.fuel_type,
        engine_type=engine.engine_type,
        hours_at_survey=engine.hours_at_survey,
        created_at=engine.created_at,
    )


def _to_list_item(vessel: Vessel, user: User) -> VesselListItem:
    return VesselListItem(
        id=vessel.id,
        name=vessel.name,
        vessel_type=vessel.vessel_type,
        propulsion_type=vessel.propulsion_type,
        hull_material=vessel.hull_material,
        year_built=vessel.year_built,
        created_at=vessel.created_at,
    )


def _to_detail(vessel: Vessel, user: User) -> VesselDetail:
    return VesselDetail(
        id=vessel.id,
        name=vessel.name,
        hin=vessel.hin,
        uscg_official_number=vessel.uscg_official_number,
        state_registration_number=vessel.state_registration_number,
        builder=vessel.builder,
        model=vessel.model,
        year_built=vessel.year_built,
        vessel_type=vessel.vessel_type,
        propulsion_type=vessel.propulsion_type,
        rigging_type=vessel.rigging_type,
        loa_ft=vessel.loa_ft,
        beam_ft=vessel.beam_ft,
        draft_ft=vessel.draft_ft,
        displacement_lbs=vessel.displacement_lbs,
        fuel_capacity_gal=vessel.fuel_capacity_gal,
        hull_material=vessel.hull_material,
        construction_notes=vessel.construction_notes,
        engines=[_to_engine(e) for e in vessel.engines],
        created_at=vessel.created_at,
        updated_at=vessel.updated_at,
    )


_config = CRUDConfig(
    model=Vessel,
    to_list_item=_to_list_item,
    to_detail=_to_detail,
    detail_load_options=[selectinload(Vessel.engines)],
    filterable_columns={"name", "vessel_type", "propulsion_type", "hull_material", "year_built", "created_at"},
    sortable_columns={"name", "year_built", "created_at"},
    label_field="name",
)

_controller = make_crud_controller("/vessels", _config)

vessel_router = Router(path="/vessels", route_handlers=[_controller], tags=["vessels"])
