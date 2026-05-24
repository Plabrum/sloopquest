from enum import Enum


class InvoiceState(Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    void = "void"
    refunded = "refunded"
