import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile, status
from app.service.ocr_service import scan_receipt_for_data

from pydantic import ValidationError
from sqlmodel import Session, select

from app.core.database import get_session
from app.middleware import get_current_user_id, require_expense_owner, require_role
from app.model.expense import ExpenseCategory, ExpenseRequest, RequestStatus
from app.model.user import UserRole
from app.schema.expense import ExpenseRequestCreate, ExpenseRequestRead, ExpenseRequestUpdate
from app.service.attachment_service import parse_attachments, store_attachments
from app.service.expense_service import (
    cancel_expense_request,
    create_expense_request,
    duplicate_expense_request,
    to_expense_read,
    update_expense_request,
)

router = APIRouter(dependencies=[Depends(require_role(UserRole.EMPLOYEE, UserRole.MANAGER))])


def _bad_request(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def _validation_error(exc: ValidationError) -> HTTPException:
    first_error = exc.errors()[0] if exc.errors() else {}
    message = first_error.get("msg", "Invalid expense request data.")
    return _bad_request(str(message).replace("Value error, ", ""))


def _parse_employee_id(value: object) -> int:
    try:
        employee_id = int(str(value))
    except (TypeError, ValueError):
        raise _bad_request("employeeId is required and must be a valid number.") from None

    if employee_id <= 0:
        raise _bad_request("employeeId is required and must be a valid number.")
    return employee_id


def _parse_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _resolve_category_id(session: Session, category_id: object, category_name: object) -> int:
    try:
        normalized_category_id = int(str(category_id))
    except (TypeError, ValueError):
        normalized_category_id = 0

    if normalized_category_id > 0:
        return normalized_category_id

    normalized_category_name = str(category_name or "").strip()
    if not normalized_category_name:
        raise _bad_request("category is required.")

    statement = select(ExpenseCategory).where(ExpenseCategory.name == normalized_category_name)
    category = session.exec(statement).first()
    if category is None or category.id is None:
        raise _bad_request(f"Unknown expense category: {normalized_category_name}")
    return category.id


def _legacy_line_item(raw_item: dict) -> dict:
    return {
        "expense_date": raw_item.get("expense_date") or raw_item.get("date"),
        "item_service_name": raw_item.get("item_service_name") or raw_item.get("name"),
        "amount": raw_item.get("amount"),
        "purpose_note": raw_item.get("purpose_note") or raw_item.get("note") or "No note provided",
    }


async def _payload_from_request(
    request: Request,
    session: Session,
    current_user_id: int,
) -> tuple[int, ExpenseRequestCreate, list[UploadFile]]:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        raw_line_items = form.get("lineItems") or form.get("line_items")
        try:
            line_items = json.loads(str(raw_line_items))
        except (TypeError, json.JSONDecodeError):
            raise _bad_request("Invalid form data format") from None

        payload_data = {
            "category_id": _resolve_category_id(
                session,
                form.get("categoryId") or form.get("category_id"),
                form.get("category"),
            ),
            "start_date": form.get("startDate") or form.get("start_date"),
            "end_date": form.get("endDate") or form.get("end_date"),
            "status": RequestStatus.DRAFT if _parse_bool(form.get("isDraft")) else RequestStatus.PENDING_MANAGER,
            "line_items": [_legacy_line_item(item) for item in line_items],
        }
        employee_id = current_user_id
        uploads = [
            value
            for value in [*form.getlist("attachments"), *form.getlist("proofs")]
            if hasattr(value, "filename") and hasattr(value, "read")
        ]
    else:
        body = await request.json()
        employee_id = current_user_id
        payload_data = {
            **body,
            "line_items": [_legacy_line_item(item) for item in body.get("lineItems", [])]
            if "lineItems" in body
            else body.get("line_items", []),
        }
        uploads = []

    try:
        payload = ExpenseRequestCreate.model_validate(payload_data)
    except ValidationError as exc:
        raise _validation_error(exc) from exc

    if not payload.line_items:
        raise _bad_request("At least one expense line item is required")

    return employee_id, payload, uploads


@router.get("", response_model=list[ExpenseRequestRead])
def list_my_expense_requests(
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> list[dict]:
    statement = select(ExpenseRequest).where(ExpenseRequest.employee_id == current_user_id)
    expenses = session.exec(statement).all()
    return [to_expense_read(expense, session) for expense in expenses]


@router.post("", response_model=ExpenseRequestRead, status_code=status.HTTP_201_CREATED)
async def create_my_expense_request(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    current_user_id, payload, uploads = await _payload_from_request(
        request,
        session,
        current_user_id,
    )
    attachments = await parse_attachments(uploads)
    expense = create_expense_request(session, current_user_id, payload)
    warnings = store_attachments(session, expense.id, attachments) if expense.id is not None else []
    response = to_expense_read(expense, session)
    if warnings:
        response["warnings"] = warnings
    return response


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
@router.post("/scan")
async def scan_expense_receipt(file: UploadFile = File(...)) -> dict:
    """
    POST /api/expenses/scan
    Accepts a single file upload and returns OCR-guessed fields:
    { date, total_amount, vendor_name, category_id }
    """
    try:
        contents = await file.read()
        result = scan_receipt_for_data(contents)
        return result
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))