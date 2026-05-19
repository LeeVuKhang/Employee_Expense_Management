from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.middleware.auth import get_current_user_id
from app.model.expense import ExpenseRequest


def require_expense_owner(
    expense_id: Annotated[int, Path(gt=0)],
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> ExpenseRequest:
    statement = select(ExpenseRequest).where(
        ExpenseRequest.id == expense_id,
        ExpenseRequest.employee_id == current_user_id,
    )
    expense = session.exec(statement).first()
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense request not found.",
        )
    return expense
