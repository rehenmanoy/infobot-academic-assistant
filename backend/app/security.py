"""Password hashing, JWT handling and the authentication / authorization dependencies."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Role, User

# bcrypt only looks at the first 72 bytes; reject longer input instead of silently truncating.
MAX_PASSWORD_BYTES = 72

# Used to spend the same time on unknown usernames as on wrong passwords.
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt()).decode()

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError("Password is too long")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        encoded = encoded[:MAX_PASSWORD_BYTES]
    try:
        return bcrypt.checkpw(encoded, (password_hash or _DUMMY_HASH).encode()) and password_hash is not None
    except ValueError:
        return False


def create_access_token(user: User) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_in = settings.access_token_expire_minutes * 60
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "role": user.role.value,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm), expires_in


_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _UNAUTHORIZED
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat"]},
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _UNAUTHORIZED from None

    user = db.get(User, user_id)
    if user is None or not user.is_active or payload.get("ver") != user.token_version:
        raise _UNAUTHORIZED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[[User], User]:
    def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to do this")
        return user

    return dependency


AdminUser = Annotated[User, Depends(require_roles(Role.ADMIN))]
ManagerUser = Annotated[User, Depends(require_roles(Role.ADMIN, Role.HOD))]
