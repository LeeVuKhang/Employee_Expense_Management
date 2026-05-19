from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.middleware import get_current_user_id, require_expense_owner
from app.model.expense import ExpenseRequest
from app.schema.expense import ExpenseRequestRead, ExpenseRequestUpdate
from app.service.expense_service import (
    cancel_expense_request,
    duplicate_expense_request,
    to_expense_read,
    update_expense_request,
)

router = APIRouter()


@router.get("/{expense_id}", response_model=ExpenseRequestRead)
def get_my_expense_request(
    expense: Annotated[ExpenseRequest, Depends(require_expense_owner)],
    session: Annotated[Session, Depends(get_session)],
) -> dict:
    return to_expense_read(expense, session)


@router.put("/{expense_id}", response_model=ExpenseRequestRead)
def update_my_expense_request(
    payload: ExpenseRequestUpdate,
    expense: Annotated[ExpenseRequest, Depends(require_expense_owner)],
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    updated = update_expense_request(session, expense, payload, current_user_id)
    return to_expense_read(updated, session)


@router.patch("/{expense_id}/cancel", response_model=ExpenseRequestRead)
def cancel_my_expense_request(
    expense: Annotated[ExpenseRequest, Depends(require_expense_owner)],
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    cancelled = cancel_expense_request(session, expense, current_user_id)
    return to_expense_read(cancelled, session)


@router.post(
    "/{expense_id}/duplicate",
    response_model=ExpenseRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_my_expense_request(
    source: Annotated[ExpenseRequest, Depends(require_expense_owner)],
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    duplicated = duplicate_expense_request(session, source, current_user_id)
    return to_expense_read(duplicated, session)
