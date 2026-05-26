from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text
from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    __table_args__ = {"extend_existing": True}

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column("user_id", ForeignKey("users.id"), nullable=False, index=True)
    )
    expense_request_id: int = Field(
        sa_column=Column(
            "expense_request_id",
            ForeignKey("expense_requests.id"),
            nullable=False,
            index=True,
        )
    )
    message: str = Field(sa_column=Column(Text, nullable=False))
    is_read: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))
    created_at: datetime | None = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime),
    )
