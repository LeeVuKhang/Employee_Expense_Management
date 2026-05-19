# app/controller/finance.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.middleware import require_finance_role
from app.model.expense import ExpenseCategory, ExpenseLineItem, ExpenseRequest, RequestStatus
from app.model.user import User
from app.schema.finance import FinanceExpenseRequestRead, FinancePendingListResponse, FinanceStatusUpdateRequest
from app.service.finance_service import get_finance_pending_requests, update_finance_request_status

router = APIRouter()


@router.get("/pending", response_model=FinancePendingListResponse)
def list_pending_finance_requests(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_finance_role)],
) -> FinancePendingListResponse:
    """
    GET /api/finance/pending
    Returns the centralized queue of expense requests that passed manager approval
    and are awaiting finance review, along with a top-level summary widget data.
    """
    return get_finance_pending_requests(session)


@router.get("/requests/{expense_id}", response_model=FinanceExpenseRequestRead)
def get_finance_expense_request(
    expense_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_finance_role)],
) -> FinanceExpenseRequestRead:
    """
    GET /api/finance/requests/{expense_id}
    Allows a Finance Officer to view full details of any request that has reached or passed manager approval.
    """
    statement = (
        select(ExpenseRequest, User.full_name, ExpenseCategory.name)
        .join(User, ExpenseRequest.employee_id == User.id)
        .join(ExpenseCategory, ExpenseRequest.category_id == ExpenseCategory.id)
        .where(ExpenseRequest.id == expense_id)
    )
    result = session.exec(statement).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense request not found.",
        )

    expense, employee_name, category_name = result

    # Check status eligibility (must have passed manager review)
    target_statuses = [
        RequestStatus.PENDING_FINANCE,
        RequestStatus.PAID,
        RequestStatus.FINANCE_APPROVED,
    ]
    if expense.status not in target_statuses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: request has not been approved by a manager yet.",
        )

    line_items_statement = select(ExpenseLineItem).where(
        ExpenseLineItem.expense_request_id == expense.id
    )
    line_items = session.exec(line_items_statement).all()

    return FinanceExpenseRequestRead(
        id=expense.id,
        employee_id=expense.employee_id,
        employee_name=employee_name,
        category_id=expense.category_id,
        category_name=category_name,
        start_date=expense.start_date,
        end_date=expense.end_date,
        total_amount=expense.total_amount,
        status=expense.status,
        current_processor_id=expense.current_processor_id,
        rejection_reason=expense.rejection_reason,
        is_locked=expense.is_locked,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        line_items=[item.model_dump() for item in line_items],
    )


@router.patch("/requests/{expense_id}/status", response_model=FinanceExpenseRequestRead)
def update_finance_request_status(
    expense_id: int,
    payload: FinanceStatusUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_finance_role)],
) -> FinanceExpenseRequestRead:
    """
    PATCH /api/finance/requests/{expense_id}/status
    Finance Officer approves/pays/rejects a manager-approved expense request.
    """
    from app.service.finance_service import update_finance_request_status

    # Fetch request
    statement = select(ExpenseRequest).where(ExpenseRequest.id == expense_id)
    expense = session.exec(statement).first()
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense request not found.",
        )

    # Verify eligible for Finance review
    if expense.status not in [RequestStatus.PENDING_FINANCE, RequestStatus.FINANCE_APPROVED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request is not in a state Finance can process.",
        )

    # Update with business rule validation
    updated = update_finance_request_status(
        session,
        expense,
        payload.status,
        payload.rejection_reason,
        current_user.id,
    )

    # Fetch full details with denormalized fields
    statement = (
        select(ExpenseRequest, User.full_name, ExpenseCategory.name)
        .join(User, ExpenseRequest.employee_id == User.id)
        .join(ExpenseCategory, ExpenseRequest.category_id == ExpenseCategory.id)
        .where(ExpenseRequest.id == updated.id)
    )
    result = session.exec(statement).first()
    expense, employee_name, category_name = result

    line_items_statement = select(ExpenseLineItem).where(
        ExpenseLineItem.expense_request_id == expense.id
    )
    line_items = session.exec(line_items_statement).all()

    return FinanceExpenseRequestRead(
        id=expense.id,
        employee_id=expense.employee_id,
        employee_name=employee_name,
        category_id=expense.category_id,
        category_name=category_name,
        start_date=expense.start_date,
        end_date=expense.end_date,
        total_amount=expense.total_amount,
        status=expense.status,
        current_processor_id=expense.current_processor_id,
        rejection_reason=expense.rejection_reason,
        is_locked=expense.is_locked,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        line_items=[item.model_dump() for item in line_items],
    )

