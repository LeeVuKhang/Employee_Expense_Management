from decimal import Decimal
from math import ceil
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func
from sqlmodel import Session, select

from app.model.expense import ExpenseCategory, ExpenseRequest, RequestStatus
from app.model.user import User, UserRole

ManagerPendingSort = Literal["created_at", "total_amount", "start_date", "employee_name"]
SortOrder = Literal["asc", "desc"]


def require_manager(session: Session, user_id: int) -> User:
    user = session.get(User, user_id)
    if user is None or user.role != UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required.",
        )
    return user


def list_pending_requests_for_manager(
    session: Session,
    manager_id: int,
    page: int,
    page_size: int,
    sort: ManagerPendingSort,
    order: SortOrder,
) -> dict:
    filters = _pending_manager_filters(manager_id)

    count_statement = (
        select(func.count())
        .select_from(ExpenseRequest)
        .join(User, ExpenseRequest.employee_id == User.id)
        .where(*filters)
    )
    total_items = session.exec(count_statement).one()

    sort_column = _sort_column(sort)
    order_by = asc(sort_column) if order == "asc" else desc(sort_column)
    offset = (page - 1) * page_size

    statement = (
        select(ExpenseRequest, User.full_name, ExpenseCategory.name)
        .join(User, ExpenseRequest.employee_id == User.id)
        .join(ExpenseCategory, ExpenseRequest.category_id == ExpenseCategory.id)
        .where(*filters)
        .order_by(order_by, ExpenseRequest.id)
        .offset(offset)
        .limit(page_size)
    )
    rows = session.exec(statement).all()

    return {
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": ceil(total_items / page_size) if total_items else 0,
        },
        "requests": [
            {
                "id": expense.id,
                "employee_id": expense.employee_id,
                "employee_name": employee_name,
                "category_id": expense.category_id,
                "category_name": category_name,
                "start_date": expense.start_date,
                "end_date": expense.end_date,
                "total_amount": expense.total_amount,
                "status": expense.status,
                "current_processor_id": expense.current_processor_id,
                "created_at": expense.created_at,
            }
            for expense, employee_name, category_name in rows
        ],
    }


def get_pending_requests_summary_for_manager(session: Session, manager_id: int) -> dict:
    filters = _pending_manager_filters(manager_id)

    statement = (
        select(
            func.count(),
            func.coalesce(func.sum(ExpenseRequest.total_amount), Decimal("0.00")),
        )
        .select_from(ExpenseRequest)
        .join(User, ExpenseRequest.employee_id == User.id)
        .where(*filters)
    )
    pending_count, total_amount = session.exec(statement).one()

    return {
        "pending_count": pending_count,
        "total_amount": total_amount,
    }


def _pending_manager_filters(manager_id: int):
    return (
        User.manager_id == manager_id,
        ExpenseRequest.employee_id == User.id,
        ExpenseRequest.status == RequestStatus.PENDING_MANAGER,
        ExpenseRequest.current_processor_id == manager_id,
    )


def _sort_column(sort: ManagerPendingSort):
    if sort == "employee_name":
        return User.full_name
    if sort == "total_amount":
        return ExpenseRequest.total_amount
    if sort == "start_date":
        return ExpenseRequest.start_date
    return ExpenseRequest.created_at
