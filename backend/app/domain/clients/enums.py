from enum import Enum


class ClientType(Enum):
    individual = "individual"
    insurance_company = "insurance_company"
    lender = "lender"
    broker = "broker"
