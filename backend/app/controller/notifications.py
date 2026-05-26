from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.middleware import get_current_user
from app.model.user import User
from app.schema.notification import NotificationRead
from app.service.notification_service import (
    get_employee_notification,
    list_notifications_for_employee,
    mark_all_notifications_read,
    mark_notification_read,
    to_notification_read,
)

router = APIRouter()


@router.get("", response_model=list[NotificationRead])
def list_my_notifications(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list:
    notifications = list_notifications_for_employee(session, current_user.id)
    return [to_notification_read(notification) for notification in notifications]


@router.patch("/read-all", response_model=list[NotificationRead])
def mark_all_my_notifications_read(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notifications = mark_all_notifications_read(session, current_user.id)
    session.commit()
    return [to_notification_read(notification) for notification in notifications]


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_my_notification_read(
    notification_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notification = get_employee_notification(session, current_user.id, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    mark_notification_read(notification)
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return to_notification_read(notification)
