from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.model.expense import RequestStatus


class ExpenseLineItemBase(BaseModel):
    expense_date: date
    item_service_name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    purpose_note: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_expense_date(self) -> "ExpenseLineItemBase":
        if self.expense_date > date.today():
            raise ValueError("expense_date cannot be in the future")
        return self


class ExpenseLineItemCreate(ExpenseLineItemBase):
    pass


class ExpenseLineItemRead(ExpenseLineItemBase):
    id: int


class ExpenseCategoryRead(BaseModel):
    id: int
    name: str


class ExpenseRequestBase(BaseModel):
    category_id: int
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "ExpenseRequestBase":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        if self.start_date > date.today() or self.end_date > date.today():
            raise ValueError("start_date and end_date cannot be in the future")
        return self


class ExpenseRequestCreate(ExpenseRequestBase):
    status: RequestStatus = RequestStatus.DRAFT
    line_items: list[ExpenseLineItemCreate] = Field(default_factory=list)


class ExpenseRequestUpdate(BaseModel):
    category_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    line_items: list[ExpenseLineItemCreate] | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ExpenseRequestUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        if (self.start_date and self.start_date > date.today()) or (
            self.end_date and self.end_date > date.today()
        ):
            raise ValueError("start_date and end_date cannot be in the future")
        return self


class ExpenseRequestRead(BaseModel):
    id: int
    employee_id: int
    category_id: int
    category_name: str | None = None
    start_date: date
    end_date: date
    total_amount: Decimal
    status: RequestStatus
    current_processor_id: int | None
    rejection_reason: str | None
    is_locked: bool
    created_at: datetime | None
    updated_at: datetime | None
    line_items: list[ExpenseLineItemRead] = Field(default_factory=list)
