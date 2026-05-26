from datetime import datetime

from pydantic import BaseModel, Field


class NotificationRead(BaseModel):
    id: int
    employee_id: int = Field(serialization_alias="employeeId")
    request_id: int = Field(serialization_alias="requestId")
    type: str
    title: str
    message: str
    is_read: bool = Field(serialization_alias="isRead")
    created_at: datetime | None = Field(serialization_alias="createdAt")

    model_config = {
        "populate_by_name": True,
    }
