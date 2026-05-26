from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.database import get_session
from app.middleware import get_current_user_id
from app.schema.expense import ExpenseRequestRead
from app.schema.manager import (
    ManagerPendingRequestsRead,
    ManagerPendingSummaryRead,
    ManagerStatusUpdateRequest,
)
from app.service.expense_service import to_expense_read
from app.service.manager_dashboard_service import (
    get_pending_requests_summary_for_manager,
    list_pending_requests_for_manager,
    require_manager,
    update_manager_request_status as update_manager_request_status_service,
)

router = APIRouter()


@router.get(
    "/expense-requests/pending",
    response_model=ManagerPendingRequestsRead,
)
def list_manager_pending_expense_requests(
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort: Literal["created_at", "total_amount", "start_date", "employee_name"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
) -> dict:
    manager = require_manager(session, current_user_id)
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
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    manager = require_manager(session, current_user_id)
    return get_pending_requests_summary_for_manager(
        session=session,
        manager_id=manager.id,
    )


@router.patch(
    "/requests/{expense_id}/status",
    response_model=ExpenseRequestRead,
)
def update_manager_request_status(
    expense_id: int,
    payload: ManagerStatusUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    manager = require_manager(session, current_user_id)

    expense = update_manager_request_status_service(
        session=session,
        expense_id=expense_id,
        manager_id=manager.id,
        new_status=payload.status,
        rejection_reason=payload.rejection_reason,
    )
    return to_expense_read(expense, session)
