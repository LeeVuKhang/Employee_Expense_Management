from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field
from pydantic import model_validator

from app.model.expense import RequestStatus


class PaginationRead(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ManagerPendingRequestRead(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    category_id: int
    category_name: str
    start_date: date
    end_date: date
    total_amount: Decimal
    status: RequestStatus
    current_processor_id: int | None
    created_at: datetime | None


class ManagerPendingRequestsRead(BaseModel):
    pagination: PaginationRead
    requests: list[ManagerPendingRequestRead] = Field(default_factory=list)


class ManagerPendingSummaryRead(BaseModel):
    pending_count: int
    total_amount: Decimal


class ManagerStatusUpdateRequest(BaseModel):
    status: RequestStatus = Field(
        ...,
        description="Target status: 'Pending Finance' or 'Rejected'",
    )
    rejection_reason: str | None = Field(default=None, min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validate_rejection_reason(self) -> "ManagerStatusUpdateRequest":
        if self.status == RequestStatus.REJECTED and not self.rejection_reason:
            raise ValueError("rejection_reason is required when status is 'Rejected'.")
        return self
