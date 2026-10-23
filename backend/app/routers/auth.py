from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, utcnow
from app.rate_limit import RateLimiter
from app.schemas import ChangePasswordRequest, LoginRequest, PreferencesUpdate, TokenResponse, UserOut
from app.security import CurrentUser, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

_settings = get_settings()
login_limiter = RateLimiter(_settings.login_max_attempts, _settings.login_window_seconds)

DbSession = Annotated[Session, Depends(get_db)]


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    key = f"{_client_ip(request)}:{data.username.lower()}"
    if login_limiter.is_limited(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(login_limiter.retry_after(key))},
        )

    user = db.scalar(select(User).where(User.username == data.username))
    # verify_password always runs bcrypt, so unknown usernames take as long as wrong passwords.
    if not verify_password(data.password, user.password_hash if user else None) or user is None or not user.is_active:
        login_limiter.hit(key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    login_limiter.reset(key)
    user.last_login_at = utcnow()
    db.commit()
    token, expires_in = create_access_token(user)
    return TokenResponse(access_token=token, expires_in=expires_in, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: CurrentUser, db: DbSession) -> None:
    """Invalidates every token issued to this user so far."""
    user.token_version += 1
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.put("/me/preferences", response_model=UserOut)
def update_preferences(data: PreferencesUpdate, user: CurrentUser, db: DbSession) -> User:
    user.preferences = data.model_dump()
    db.commit()
    return user


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: ChangePasswordRequest, user: CurrentUser, db: DbSession) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    user.token_version += 1
    db.commit()
