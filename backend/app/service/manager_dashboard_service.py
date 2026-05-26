from decimal import Decimal
from math import ceil
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func
from sqlmodel import Session, select

from app.model.expense import ExpenseCategory, ExpenseRequest, RequestHistory, RequestStatus
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


def approve_request_for_finance(
    session: Session,
    expense_id: int,
    manager_id: int,
) -> ExpenseRequest:
    statement = (
        select(ExpenseRequest, User.manager_id)
        .join(User, ExpenseRequest.employee_id == User.id)
        .where(ExpenseRequest.id == expense_id)
    )
    result = session.exec(statement).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense request not found.",
        )

    expense, employee_manager_id = result
    if employee_manager_id != manager_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this request is not assigned to your team.",
        )

    if expense.current_processor_id not in {None, manager_id}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this request is assigned to another processor.",
        )

    if expense.status != RequestStatus.PENDING_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only requests with status 'Pending Manager' can be approved.",
        )

    expense.status = RequestStatus.PENDING_FINANCE
    expense.current_processor_id = None
    expense.rejection_reason = None

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=manager_id,
            action_taken="Approved",
            comments="Approved by manager and forwarded to Finance.",
        )
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


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
