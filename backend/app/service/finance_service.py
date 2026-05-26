# app/service/finance_service.py
from decimal import Decimal
from sqlmodel import Session, select
from fastapi import HTTPException, status

from app.model.expense import ExpenseLineItem, ExpenseRequest, RequestStatus, ExpenseCategory
from app.model.user import User
from app.schema.finance import FinanceExpenseRequestRead, FinancePendingListResponse, FinancePendingSummary
from app.service.notification_service import (
    create_finance_approved_notification,
    create_request_paid_notification,
    create_request_rejected_notification,
)


def get_finance_pending_requests(session: Session) -> FinancePendingListResponse:
    """
    Fetches all expense requests relevant to the Finance Officer queue:
    - Pending Finance (awaiting review)
    - Paid (already processed)
    - Finance Approved (approved but not yet paid)

    Calculates summary statistics (total count, total amount) ONLY for the 'Pending Finance' requests.
    """
    # Fetch all requests that have reached or passed manager approval for Finance view
    target_statuses = [
        RequestStatus.PENDING_FINANCE,
        RequestStatus.PAID,
        RequestStatus.FINANCE_APPROVED,
    ]

    statement = (
        select(ExpenseRequest, User.full_name, ExpenseCategory.name)
        .join(User, ExpenseRequest.employee_id == User.id)
        .join(ExpenseCategory, ExpenseRequest.category_id == ExpenseCategory.id)
        .where(ExpenseRequest.status.in_(target_statuses))
        .order_by(ExpenseRequest.created_at.desc())
    )

    results = session.exec(statement).all()

    requests_list = []
    total_pending = 0
    total_amount = Decimal("0.00")

    for expense, employee_name, category_name in results:
        # Fetch line items for this expense request
        line_items_statement = select(ExpenseLineItem).where(
            ExpenseLineItem.expense_request_id == expense.id
        )
        line_items = session.exec(line_items_statement).all()

        # Build request dict mapping to FinanceExpenseRequestRead schema
        request_data = FinanceExpenseRequestRead(
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
            line_items=[item.model_dump() for item in line_items]
        )

        requests_list.append(request_data)

        # Only calculate stats for requests that are actively 'Pending Finance' (awaiting processing)
        if expense.status == RequestStatus.PENDING_FINANCE:
            total_pending += 1
            total_amount += expense.total_amount

    summary = FinancePendingSummary(
        total_pending=total_pending,
        total_amount=total_amount
    )

    return FinancePendingListResponse(
        summary=summary,
        requests=requests_list
    )

def update_finance_request_status(
    session: Session,
    expense: ExpenseRequest,
    new_status: RequestStatus,
    rejection_reason: str | None = None,
    actor_id: int | None = None,
) -> ExpenseRequest:
    """
    Finance Officer updates request status with strict validation.
    - Only 'Finance Approved', 'Paid', 'Rejected' are allowed.
    - 'Paid' requires current status to be 'Finance Approved'.
    - 'Rejected' requires rejection_reason.
    """
    from app.model.expense import RequestHistory

    # AC1: Validate target statuses
    allowed_statuses = {
        RequestStatus.FINANCE_APPROVED,
        RequestStatus.PAID,
        RequestStatus.REJECTED,
    }
    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Finance can only set status to: {', '.join(s.value for s in allowed_statuses)}",
        )

    # AC2: Enforce Paid → Finance Approved prerequisite
    if new_status == RequestStatus.PAID:
        if expense.status != RequestStatus.FINANCE_APPROVED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot mark as Paid. Current status is '{expense.status.value}'; must be 'Finance Approved'.",
            )

    # AC3: Enforce rejection_reason on reject
    if new_status == RequestStatus.REJECTED:
        if not rejection_reason or not rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="rejection_reason is required when declining a request.",
            )
        expense.rejection_reason = rejection_reason.strip()
        expense.current_processor_id = expense.employee_id

    if new_status == RequestStatus.PAID:
        expense.current_processor_id = expense.employee_id

    expense.status = new_status
    expense.is_locked = True  # Lock after Finance processes

    if new_status == RequestStatus.REJECTED:
        create_request_rejected_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
            rejection_reason=expense.rejection_reason,
        )

    if new_status == RequestStatus.FINANCE_APPROVED:
        create_finance_approved_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
        )

    if new_status == RequestStatus.PAID:
        create_request_paid_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
        )

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=actor_id,
            action_taken=new_status.value,
            comments=rejection_reason,
        )
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense
