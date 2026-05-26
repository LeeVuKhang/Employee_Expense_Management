from sqlmodel import Session

from app.model.expense import ExpenseRequest, Notification, RequestStatus


def queue_status_change_notification(
    session: Session,
    expense: ExpenseRequest,
    new_status: RequestStatus,
    actor_role: str,
    rejection_reason: str | None = None,
) -> None:
    if expense.id is None:
        return

    message = _build_status_change_message(
        expense_id=expense.id,
        new_status=new_status,
        actor_role=actor_role,
        rejection_reason=rejection_reason,
    )
    session.add(
        Notification(
            user_id=expense.employee_id,
            expense_request_id=expense.id,
            message=message,
        )
    )


def _build_status_change_message(
    expense_id: int,
    new_status: RequestStatus,
    actor_role: str,
    rejection_reason: str | None,
) -> str:
    if new_status == RequestStatus.PENDING_FINANCE:
        return (
            f"Expense request #{expense_id} was approved by {actor_role} "
            "and moved to Pending Finance."
        )
    if new_status == RequestStatus.FINANCE_APPROVED:
        return f"Expense request #{expense_id} was approved by {actor_role}."
    if new_status == RequestStatus.REJECTED:
        reason = (rejection_reason or "").strip()
        if reason:
            return (
                f"Expense request #{expense_id} was rejected by {actor_role}. "
                f"Reason: {reason}"
            )
        return f"Expense request #{expense_id} was rejected by {actor_role}."

    return f"Expense request #{expense_id} status changed to {new_status.value}."
