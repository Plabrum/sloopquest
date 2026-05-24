from enum import Enum


class VesselType(Enum):
    sailboat_monohull = "sailboat_monohull"
    sailboat_multihull = "sailboat_multihull"
    motor_yacht = "motor_yacht"
    sport_fish = "sport_fish"
    trawler = "trawler"
    runabout = "runabout"
    center_console = "center_console"
    pontoon = "pontoon"
    commercial = "commercial"
    other = "other"


class PropulsionType(Enum):
    sail = "sail"
    inboard = "inboard"
    outboard = "outboard"
    sterndrive = "sterndrive"
    jet = "jet"
    electric = "electric"
    sail_aux = "sail_aux"


class RiggingType(Enum):
    masthead_sloop = "masthead_sloop"
    fractional_sloop = "fractional_sloop"
    cutter = "cutter"
    ketch = "ketch"
    yawl = "yawl"
    schooner = "schooner"
    cat = "cat"
    none = "none"


class HullMaterial(Enum):
    frp = "frp"
    wood = "wood"
    aluminum = "aluminum"
    steel = "steel"
    composite = "composite"
    ferrocement = "ferrocement"
    other = "other"


class FuelType(Enum):
    diesel = "diesel"
    gasoline = "gasoline"
    electric = "electric"
    hybrid = "hybrid"
    lpg = "lpg"


class EngineType(Enum):
    inboard = "inboard"
    outboard = "outboard"
    sterndrive = "sterndrive"
    jet = "jet"
    electric = "electric"


class EnginePosition(Enum):
    port = "port"
    starboard = "starboard"
    center = "center"
    single = "single"
    gen_1 = "gen_1"
    gen_2 = "gen_2"
