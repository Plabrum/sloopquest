from enum import StrEnum, auto


class Role(StrEnum):
    SUPERADMIN = auto()
    ADMIN = auto()
    MEMBER = auto()
    SYSTEM = auto()
    CLIENT = auto()
