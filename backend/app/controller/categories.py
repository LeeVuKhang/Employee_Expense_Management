from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.model.expense import ExpenseCategory
from app.schema.expense import ExpenseCategoryRead

router = APIRouter()


@router.get("/expense-categories", response_model=list[ExpenseCategoryRead])
def get_expense_categories(
    session: Annotated[Session, Depends(get_session)],
) -> list[ExpenseCategory]:
    statement = (
        select(ExpenseCategory)
        .where(ExpenseCategory.is_active == True)  # noqa: E712
        .order_by(ExpenseCategory.name)
    )
    return list(session.exec(statement).all())
