from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.middleware import get_current_user
from app.model.user import User
from app.schema.auth import LoginRequest, LoginResponse, UserRead
from app.service.auth_service import authenticate_user, create_access_token

router = APIRouter()


def to_user_read(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    session: Annotated[Session, Depends(get_session)],
) -> LoginResponse:
    user = authenticate_user(session, payload.email, payload.password)
    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "email": user.email,
        }
    )

    return LoginResponse(access_token=access_token, user=to_user_read(user))


@router.get("/me", response_model=UserRead)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    return to_user_read(current_user)
