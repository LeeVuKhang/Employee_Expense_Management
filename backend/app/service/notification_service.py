from sqlmodel import Session, select

from app.model.notification import Notification


def format_request_id(request_id: int | None) -> str:
    return f"REQ-{str(request_id or 0).zfill(3)}"


def notification_title_for_message(message: str) -> str:
    lowered_message = message.lower()
    if "paid" in lowered_message:
        return "Expense Request Paid"
    if "rejected" in lowered_message:
        return "Expense Request Rejected"
    return "Expense Notification"


def notification_type_for_message(message: str) -> str:
    lowered_message = message.lower()
    if "paid" in lowered_message:
        return "REQUEST_PAID"
    if "rejected" in lowered_message:
        return "REQUEST_REJECTED"
    return "EXPENSE_NOTIFICATION"


def to_notification_read(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "employee_id": notification.user_id,
        "request_id": notification.expense_request_id,
        "type": notification_type_for_message(notification.message),
        "title": notification_title_for_message(notification.message),
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


def create_request_rejected_notification(
    session: Session,
    employee_id: int,
    request_id: int,
    rejection_reason: str,
) -> Notification:
    normalized_reason = rejection_reason.strip()
    notification = Notification(
        user_id=employee_id,
        expense_request_id=request_id,
        message=(
            f"Your request {format_request_id(request_id)} was rejected. "
            f"Reason: {normalized_reason}"
        ),
    )
    session.add(notification)
    return notification


def create_request_paid_notification(
    session: Session,
    employee_id: int,
    request_id: int,
) -> Notification:
    notification = Notification(
        user_id=employee_id,
        expense_request_id=request_id,
        message=(
            f"Your request {format_request_id(request_id)} has been marked as paid. "
            "Your money is on the way."
        ),
    )
    session.add(notification)
    return notification


def list_notifications_for_employee(
    session: Session,
    employee_id: int,
) -> list[Notification]:
    statement = (
        select(Notification)
        .where(Notification.user_id == employee_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    return list(session.exec(statement).all())


def get_employee_notification(
    session: Session,
    employee_id: int,
    notification_id: int,
) -> Notification | None:
    statement = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == employee_id,
    )
    return session.exec(statement).first()


def mark_notification_read(notification: Notification) -> Notification:
    notification.is_read = True
    return notification


def mark_all_notifications_read(
    session: Session,
    employee_id: int,
) -> list[Notification]:
    notifications = list_notifications_for_employee(session, employee_id)
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    return notifications


def queue_status_change_notification(
    session: Session,
    expense: "ExpenseRequest",
    new_status: "RequestStatus",
    actor_role: str,
    rejection_reason: str | None = None,
) -> Notification | None:
    from app.model.expense import RequestStatus

    if new_status == RequestStatus.REJECTED and rejection_reason:
        return create_request_rejected_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
            rejection_reason=rejection_reason,
        )
    if new_status == RequestStatus.PAID:
        return create_request_paid_notification(
            session=session,
            employee_id=expense.employee_id,
            request_id=expense.id,
        )
    return None

