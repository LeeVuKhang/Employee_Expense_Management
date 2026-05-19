from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.model.expense import (
    ExpenseCategory,
    ExpenseLineItem,
    ExpenseRequest,
    RequestHistory,
    RequestStatus,
)
from app.schema.expense import ExpenseLineItemCreate, ExpenseRequestCreate, ExpenseRequestUpdate


EDITABLE_STATUSES = {RequestStatus.DRAFT, RequestStatus.PENDING_MANAGER}


def _status_value(status_value: RequestStatus | str) -> str:
    if isinstance(status_value, RequestStatus):
        return status_value.value
    return status_value


def _ensure_editable(expense: ExpenseRequest) -> None:
    status_value = _status_value(expense.status)
    if status_value not in {status.value for status in EDITABLE_STATUSES} or expense.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Draft or Pending Manager requests can be changed.",
        )


def _line_items_total(line_items: list[ExpenseLineItemCreate]) -> Decimal:
    return sum((line_item.amount for line_item in line_items), Decimal("0.00"))


def _get_line_items(session: Session, expense_id: int) -> list[ExpenseLineItem]:
    statement = select(ExpenseLineItem).where(ExpenseLineItem.expense_request_id == expense_id)
    return list(session.exec(statement).all())


def create_expense_request(
    session: Session,
    employee_id: int,
    payload: ExpenseRequestCreate,
) -> ExpenseRequest:
    expense = ExpenseRequest(
        employee_id=employee_id,
        category_id=payload.category_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        total_amount=_line_items_total(payload.line_items),
    )
    session.add(expense)
    session.flush()

    for line_item in payload.line_items:
        session.add(ExpenseLineItem(expense_request_id=expense.id, **line_item.model_dump()))

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=employee_id,
            action_taken="Created",
        )
    )
    session.commit()
    session.refresh(expense)
    return expense


def update_expense_request(
    session: Session,
    expense: ExpenseRequest,
    payload: ExpenseRequestUpdate,
    actor_id: int,
) -> ExpenseRequest:
    _ensure_editable(expense)

    update_data = payload.model_dump(exclude_unset=True, exclude={"line_items"})
    for field_name, value in update_data.items():
        setattr(expense, field_name, value)

    if payload.line_items is not None:
        for existing_item in _get_line_items(session, expense.id):
            session.delete(existing_item)
        session.flush()

        for line_item in payload.line_items:
            session.add(ExpenseLineItem(expense_request_id=expense.id, **line_item.model_dump()))
        expense.total_amount = _line_items_total(payload.line_items)

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=actor_id,
            action_taken="Updated",
        )
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


def cancel_expense_request(
    session: Session,
    expense: ExpenseRequest,
    actor_id: int,
) -> ExpenseRequest:
    _ensure_editable(expense)
    expense.status = RequestStatus.CANCELLED
    expense.is_locked = True

    session.add(
        RequestHistory(
            expense_request_id=expense.id,
            actor_id=actor_id,
            action_taken="Cancelled",
            comments="Cancelled by employee.",
        )
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


def duplicate_expense_request(
    session: Session,
    source: ExpenseRequest,
    actor_id: int,
) -> ExpenseRequest:
    source_line_items = _get_line_items(session, source.id)
    new_expense = ExpenseRequest(
        employee_id=actor_id,
        category_id=source.category_id,
        start_date=source.start_date,
        end_date=source.end_date,
        status=RequestStatus.DRAFT,
        total_amount=source.total_amount,
        is_locked=False,
    )
    session.add(new_expense)
    session.flush()

    for source_item in source_line_items:
        session.add(
            ExpenseLineItem(
                expense_request_id=new_expense.id,
                expense_date=source_item.expense_date,
                item_service_name=source_item.item_service_name,
                amount=source_item.amount,
                purpose_note=source_item.purpose_note,
            )
        )

    session.add(
        RequestHistory(
            expense_request_id=new_expense.id,
            actor_id=actor_id,
            action_taken="Duplicated",
            comments=f"Duplicated from request #{source.id}.",
        )
    )
    session.commit()
    session.refresh(new_expense)
    return new_expense


def to_expense_read(expense: ExpenseRequest, session: Session) -> dict:
    category = session.get(ExpenseCategory, expense.category_id)
    return {
        **expense.model_dump(),
        "category_name": category.name if category else None,
        "line_items": [
            line_item.model_dump()
            for line_item in _get_line_items(session, expense.id)
        ],
    }

