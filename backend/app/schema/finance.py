# app/schema/finance.py
# Response schemas cho Finance Pending Requests feature.

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.model.expense import RequestStatus
from app.schema.expense import ExpenseLineItemRead


class FinancePendingSummary(BaseModel):
    """AC1: Summary widget — total pending count & total monetary amount."""

    total_pending: int
    total_amount: Decimal


class FinanceExpenseRequestRead(BaseModel):
    """AC2: A single manager-approved request visible to Finance Officer."""

    id: int
    employee_id: int
    employee_name: str           # denormalised from users table
    category_id: int
    category_name: str           # denormalised from expense_categories table
    start_date: date
    end_date: date
    total_amount: Decimal
    status: RequestStatus
    current_processor_id: int | None
    rejection_reason: str | None
    is_locked: bool
    created_at: datetime | None
    updated_at: datetime | None
    line_items: list[ExpenseLineItemRead]


class FinancePendingListResponse(BaseModel):
    """Combined response: summary widget + request list."""

    summary: FinancePendingSummary
    requests: list[FinanceExpenseRequestRead]
