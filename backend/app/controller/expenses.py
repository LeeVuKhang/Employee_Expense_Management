import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
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
        uploads = []
        
        # 1. Trích xuất các tệp đính kèm từ form gửi lên
        for key in ["file", "attachments", "proofs"]:
            for value in form.getlist(key):
                if hasattr(value, "filename") and hasattr(value, "read"):
                    uploads.append(value)

        # 2. Xử lý bóc tách khối dữ liệu text
        if "data" in form:
            try:
                payload_data = json.loads(str(form.get("data")))
            except (TypeError, json.JSONDecodeError):
                raise _bad_request("Trường 'data' trong FormData không đúng định dạng JSON.")
            
            # Đồng bộ an toàn giữa camelCase và snake_case không dùng hàm .pop() nguy hiểm
            if "categoryId" in payload_data and "category_id" not in payload_data:
                payload_data["category_id"] = payload_data["categoryId"]
            if "startDate" in payload_data and "start_date" not in payload_data:
                payload_data["start_date"] = payload_data["startDate"]
            if "endDate" in payload_data and "end_date" not in payload_data:
                payload_data["end_date"] = payload_data["endDate"]
            if "lineItems" in payload_data and "line_items" not in payload_data:
                payload_data["line_items"] = payload_data["lineItems"]

            employee_id = _parse_employee_id(
                payload_data.get("employee_id") or payload_data.get("employeeId") or form.get("employeeId") or x_user_id
            )
        else:
            # Fallback nếu React bóc tách phẳng rời rạc từng trường text
            raw_line_items = form.get("lineItems") or form.get("line_items") or "[]"
            try:
                line_items = json.loads(str(raw_line_items))
            except (TypeError, json.JSONDecodeError):
                raise _bad_request("Danh sách lineItems không đúng định dạng JSON string.")

            payload_data = {
                "category_id": _resolve_category_id(
                    session,
                    form.get("categoryId") or form.get("category_id"),
                    form.get("category"),
                ),
                "start_date": form.get("startDate") or form.get("start_date"),
                "end_date": form.get("endDate") or form.get("end_date"),
                "status": RequestStatus.DRAFT if _parse_bool(form.get("isDraft")) else RequestStatus.PENDING_MANAGER,
                "line_items": line_items,
            }
            employee_id = _parse_employee_id(form.get("employeeId") or form.get("employee_id") or x_user_id)

        # Làm sạch mảng line_items con
        if "line_items" in payload_data and isinstance(payload_data["line_items"], list):
            payload_data["line_items"] = [_legacy_line_item(item) for item in payload_data["line_items"]]
                    
    else:
        # Xử lý dữ liệu JSON Raw truyền thống khi không có file ảnh
        body = await request.json()
        employee_id = _parse_employee_id(body.get("employeeId") or body.get("employee_id") or x_user_id)
        
        raw_items = body.get("lineItems") or body.get("line_items") or []
        payload_data = {
            **body,
            "line_items": [_legacy_line_item(item) for item in raw_items]
        }

    # Thực hiện validate qua Pydantic Model để áp ràng buộc dữ liệu
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
    if attachments:
        session.refresh(expense)

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
async def update_my_expense_request(
    request: Request, # Thay đổi từ payload sang nhận trực tiếp request thực thể
    expense: Annotated[ExpenseRequest, Depends(require_expense_owner)],
    session: Annotated[Session, Depends(get_session)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> dict:
    # 1. Tận dụng hàm helper chung để bóc tách text và file (nếu người dùng cập nhật lại ảnh mới)
    _, payload_create, uploads = await _payload_from_request(request, session, current_user_id)
    
    # 2. Ép kiểu dữ liệu sang cấu trúc Schema Update
    payload = ExpenseRequestUpdate(
        category_id=payload_create.category_id,
        start_date=payload_create.start_date,
        end_date=payload_create.end_date,
        line_items=payload_create.line_items
    )
    
    # 3. Tiến hành cập nhật Database chi tiêu
    updated = update_expense_request(session, expense, payload, current_user_id)
    
    # 4. Xử lý tệp đính kèm mới nếu có upload bổ sung khi chỉnh sửa
    if uploads:
        attachments = await parse_attachments(uploads)
        store_attachments(session, updated.id, attachments)

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
