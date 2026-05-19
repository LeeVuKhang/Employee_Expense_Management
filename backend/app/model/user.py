from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    EMPLOYEE = "Employee"
    MANAGER = "Manager"
    FINANCE = "Finance"
    SYSTEM_ADMINISTRATOR = "System Administrator"


user_role_column = SAEnum(
    UserRole,
    name="user_role",
    values_callable=lambda roles: [role.value for role in roles],
    create_type=False,
)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    full_name: str = Field(sa_column=Column(String(150), nullable=False))
    email: str = Field(sa_column=Column(String(255), unique=True, nullable=False))
    role: UserRole = Field(sa_column=Column(user_role_column, nullable=False))
    manager_id: int | None = Field(default=None, foreign_key="users.id")
    created_at: datetime | None = None
