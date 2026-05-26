from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.middleware import require_manager_role
from app.model.expense import ExpenseRequest, RequestHistory, RequestStatus
from app.model.user import User, UserRole
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
)
from app.service.expense_service import to_expense_read
from app.service.notification_service import create_request_rejected_notification

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


def _get_finance_processor_id(session: Session) -> int | None:
    return session.exec(select(User.id).where(User.role == UserRole.FINANCE).order_by(User.id)).first()


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
    expense = _get_manager_request(session, manager.id, expense_id)

    if expense.status != RequestStatus.PENDING_MANAGER or expense.is_locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request is not in a state Manager can process.",
        )

    if payload.status not in {RequestStatus.PENDING_FINANCE, RequestStatus.REJECTED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manager can only set status to: Pending Finance, Rejected",
        )

    rejection_reason = payload.rejection_reason.strip() if payload.rejection_reason else None
    if payload.status == RequestStatus.REJECTED and not rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rejection_reason is required when rejecting a request.",
        )

    expense.status = payload.status
    expense.is_locked = True
    expense.rejection_reason = rejection_reason
    if payload.status == RequestStatus.PENDING_FINANCE:
        expense.current_processor_id = _get_finance_processor_id(session)
    if payload.status == RequestStatus.REJECTED:
        expense.current_processor_id = expense.employee_id
        create_request_rejected_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
            rejection_reason=rejection_reason,
        )

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=manager.id,
            action_taken=payload.status.value,
            comments=rejection_reason,
        )
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return to_expense_read(expense, session)
