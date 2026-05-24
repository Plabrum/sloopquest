from enum import StrEnum, auto


class WidgetType(StrEnum):
    AREA_CHART = auto()
    BAR_CHART = auto()
    STAT_NUMBER = auto()
    RESOURCE_TABLE = auto()
    CHILD_LIST = auto()
    KANBAN = auto()


class ResourceType(StrEnum):
    INVOICES = auto()
    SURVEYS = auto()
    VESSELS = auto()
    REPORTS = auto()
    CLIENTS = auto()


class WidgetColor(StrEnum):
    BLUE = auto()
    GREEN = auto()
    RED = auto()
    YELLOW = auto()
