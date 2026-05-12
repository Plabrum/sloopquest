from enum import Enum


class SequenceType(Enum):
    invoice_identifier = "invoice_identifier"
    quote_identifier = "quote_identifier"
    survey_identifier = "survey_identifier"
    report_identifier = "report_identifier"
