from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


class RequestStatus(str, Enum):
    DRAFT = "Draft"
    PENDING_MANAGER = "Pending Manager"
    PENDING_FINANCE = "Pending Finance"
    FINANCE_APPROVED = "Finance Approved"
    PAID = "Paid"
    REJECTED = "Rejected"
    CANCELLED = "Cancelled"


request_status_column = SAEnum(
    RequestStatus,
    name="request_status",
    values_callable=lambda statuses: [status.value for status in statuses],
    create_type=False,
)


class ExpenseCategory(SQLModel, table=True):
    __tablename__ = "expense_categories"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(100), unique=True, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text))
    is_active: bool = True


class ExpenseRequest(SQLModel, table=True):
    __tablename__ = "expense_requests"

    id: int | None = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="users.id", index=True)
    category_id: int = Field(foreign_key="expense_categories.id")
    start_date: date
    end_date: date
    total_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )
    status: RequestStatus = Field(
        default=RequestStatus.DRAFT,
        sa_column=Column(request_status_column, nullable=False),
    )
    current_processor_id: int | None = Field(default=None, foreign_key="users.id")
    rejection_reason: str | None = Field(default=None, sa_column=Column(Text))
    is_locked: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ExpenseLineItem(SQLModel, table=True):
    __tablename__ = "expense_line_items"

    id: int | None = Field(default=None, primary_key=True)
    expense_request_id: int = Field(
        sa_column=Column(
            ForeignKey("expense_requests.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    expense_date: date
    item_service_name: str = Field(sa_column=Column(String(255), nullable=False))
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    purpose_note: str = Field(sa_column=Column(Text, nullable=False))


class Attachment(SQLModel, table=True):
    __tablename__ = "attachments"

    id: int | None = Field(default=None, primary_key=True)
    expense_request_id: int = Field(
        sa_column=Column(
            ForeignKey("expense_requests.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    file_name: str = Field(sa_column=Column(String(255), nullable=False))
    file_url: str = Field(sa_column=Column(String(1024), nullable=False))
    s3_bucket: str = Field(sa_column=Column(String(255), nullable=False))
    s3_key: str = Field(sa_column=Column(String(1024), nullable=False))
    content_type: str | None = Field(default=None, sa_column=Column(String(255)))
    file_size_bytes: int = Field(sa_column=Column(BigInteger, nullable=False))
    uploaded_at: datetime | None = None


class RequestHistory(SQLModel, table=True):
    __tablename__ = "request_history"

    id: int | None = Field(default=None, primary_key=True)
    expense_request_id: int = Field(
        sa_column=Column(
            ForeignKey("expense_requests.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    actor_id: int = Field(foreign_key="users.id")
    action_taken: str = Field(sa_column=Column(String(50), nullable=False))
    comments: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime | None = None
