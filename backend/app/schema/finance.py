# app/schema/finance.py
# Response schemas cho Finance Pending Requests feature.

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

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


class FinanceStatusUpdateRequest(BaseModel):
    """Request payload for Finance Officer to approve/reject/pay an expense."""
    
    status: RequestStatus = Field(..., description="Target status: 'Finance Approved', 'Paid', or 'Rejected'")
    rejection_reason: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
        description="Mandatory explanation if status is 'Rejected'"
    )
    
    @model_validator(mode="after")
    def validate_rejection_reason(self) -> "FinanceStatusUpdateRequest":
        if self.status == RequestStatus.REJECTED and not self.rejection_reason:
            raise ValueError("rejection_reason is required when status is 'Rejected'.")
        return self
