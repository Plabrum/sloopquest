from enum import StrEnum, auto


class Role(StrEnum):
    ADMIN = auto()
    SURVEYOR = auto()
    CLIENT = auto()
