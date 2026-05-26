from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.model.expense import (
    Attachment,
    ExpenseCategory,
    ExpenseLineItem,
    ExpenseRequest,
    RequestHistory,
    RequestStatus,
)
from app.model.user import User
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


def _get_attachments(session: Session, expense_id: int) -> list[Attachment]:
    statement = select(Attachment).where(Attachment.expense_request_id == expense_id)
    return list(session.exec(statement).all())


def _get_category_name(session: Session, category_id: int) -> str | None:
    statement = select(ExpenseCategory.name).where(ExpenseCategory.id == category_id)
    return session.exec(statement).first()


def _get_user_name(session: Session, user_id: int | None) -> str | None:
    if user_id is None:
        return None

    statement = select(User.full_name).where(User.id == user_id)
    return session.exec(statement).first()


def create_expense_request(
    session: Session,
    employee_id: int,
    payload: ExpenseRequestCreate,
) -> ExpenseRequest:
    current_processor_id = None
    if payload.status == RequestStatus.PENDING_MANAGER:
        current_processor_id = session.exec(
            select(User.manager_id).where(User.id == employee_id)
        ).first()
        if current_processor_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee does not have an assigned manager.",
            )

    expense = ExpenseRequest(
        employee_id=employee_id,
        category_id=payload.category_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        current_processor_id=current_processor_id,
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


def to_expense_read(
    expense: ExpenseRequest,
    session: Session,
    *,
    include_attachments: bool = False,
) -> dict:
    response = {
        **expense.model_dump(),
        "employee_name": _get_user_name(session, expense.employee_id),
        "category_name": _get_category_name(session, expense.category_id),
        "current_processor_name": _get_user_name(session, expense.current_processor_id),
        "line_items": [
            line_item.model_dump()
            for line_item in _get_line_items(session, expense.id)
        ],
    }
    if include_attachments:
        response["attachments"] = [
            {
                "id": attachment.id,
                "file_name": attachment.file_name,
                "content_type": attachment.content_type,
                "file_size_bytes": attachment.file_size_bytes,
                "uploaded_at": attachment.uploaded_at,
            }
            for attachment in _get_attachments(session, expense.id)
        ]
    return response
