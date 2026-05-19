# app/service/finance_service.py
from decimal import Decimal
from sqlmodel import Session, select

from app.model.expense import ExpenseLineItem, ExpenseRequest, RequestStatus, ExpenseCategory
from app.model.user import User
from app.schema.finance import FinanceExpenseRequestRead, FinancePendingListResponse, FinancePendingSummary


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
