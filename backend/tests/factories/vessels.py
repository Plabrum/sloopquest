"""Factories for Vessel and Engine."""

from faker import Faker
from polyfactory import Use

from app.domain.vessels.enums import EnginePosition, FuelType, PropulsionType, VesselType
from app.domain.vessels.models import Engine, Vessel

from .base import BaseFactory

fake = Faker()


class VesselFactory(BaseFactory):
    __model__ = Vessel

    name = Use(lambda: f"S/V {fake.last_name}")
    hin = None
    uscg_official_number = None
    state_registration_number = None
    builder = None
    manufacturer_id = None
    model = None
    year_built = None
    vessel_type = VesselType.sailboat_monohull
    propulsion_type = PropulsionType.sail
    rigging_type = None
    loa_ft = None
    beam_ft = None
    draft_ft = None
    displacement_lbs = None
    fuel_capacity_gal = None
    hull_material = None
    construction_notes = None
    home_port_address_id = None

    home_port_address = None
    engines = []


class EngineFactory(BaseFactory):
    __model__ = Engine

    position = EnginePosition.single
    make = None
    manufacturer_id = None
    model = None
    serial_number = None
    year = None
    horsepower = None
    fuel_type = FuelType.diesel
    engine_type = None
    hours_at_survey = None

    vessel = None
