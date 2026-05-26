from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.database import get_session
from app.model.user import User, UserRole
from app.service.auth_service import decode_access_token


security = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        normalized_user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token") from None

    user = session.exec(select(User).where(User.id == normalized_user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_id(
    current_user: Annotated[User, Depends(get_current_user)],
) -> int:
    return current_user.id


def require_role(*allowed_roles: UserRole):
    def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Access forbidden: requires "
                    f"{' or '.join(role.value for role in allowed_roles)} role."
                ),
            )
        return current_user

    return role_checker


require_finance_role = require_role(UserRole.FINANCE)
require_manager_role = require_role(UserRole.MANAGER)
