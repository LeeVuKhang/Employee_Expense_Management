from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.middleware import require_manager_role
from app.model.expense import ExpenseRequest
from app.model.user import User
from app.schema.expense import ExpenseRequestRead
from app.schema.manager import (
    ManagerPendingRequestsRead,
    ManagerPendingSummaryRead,
    ManagerStatusUpdateRequest,
)
from app.service.manager_dashboard_service import (
    get_pending_requests_summary_for_manager,
    list_pending_requests_for_manager,
    require_manager,
    update_manager_request_status as update_manager_request_status_service,
)
from app.service.expense_service import to_expense_read

router = APIRouter()


def _get_manager_request(
    session: Session,
    manager_id: int,
    expense_id: int,
) -> ExpenseRequest:
    statement = (
        select(ExpenseRequest)
        .join(User, ExpenseRequest.employee_id == User.id)
        .where(
            ExpenseRequest.id == expense_id,
            User.manager_id == manager_id,
            ExpenseRequest.current_processor_id == manager_id,
        )
    )
    expense = session.exec(statement).first()
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense request not found.",
        )
    return expense


@router.get(
    "/expense-requests/pending",
    response_model=ManagerPendingRequestsRead,
)
def list_manager_pending_expense_requests(
    session: Annotated[Session, Depends(get_session)],
    current_manager: Annotated[User, Depends(require_manager_role)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort: Literal["created_at", "total_amount", "start_date", "employee_name"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
) -> dict:
    manager = require_manager(session, current_manager.id)
    return list_pending_requests_for_manager(
        session=session,
        manager_id=manager.id,
        page=page,
        page_size=page_size,
        sort=sort,
        order=order,
    )


@router.get(
    "/expense-requests/pending/summary",
    response_model=ManagerPendingSummaryRead,
)
def get_manager_pending_expense_requests_summary(
    session: Annotated[Session, Depends(get_session)],
    current_manager: Annotated[User, Depends(require_manager_role)],
) -> dict:
    manager = require_manager(session, current_manager.id)
    return get_pending_requests_summary_for_manager(
        session=session,
        manager_id=manager.id,
    )


@router.get("/requests/{expense_id}", response_model=ExpenseRequestRead)
def get_manager_expense_request(
    expense_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_manager: Annotated[User, Depends(require_manager_role)],
) -> dict:
    manager = require_manager(session, current_manager.id)
    expense = _get_manager_request(session, manager.id, expense_id)
    return to_expense_read(expense, session)


@router.patch("/requests/{expense_id}/status", response_model=ExpenseRequestRead)
def update_manager_expense_request_status(
    expense_id: int,
    payload: ManagerStatusUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
    current_manager: Annotated[User, Depends(require_manager_role)],
) -> dict:
    manager = require_manager(session, current_manager.id)
    _get_manager_request(session, manager.id, expense_id)
    updated = update_manager_request_status_service(
        session=session,
        expense_id=expense_id,
        manager_id=manager.id,
        new_status=payload.status,
        rejection_reason=payload.rejection_reason,
    )
    return to_expense_read(updated, session)
