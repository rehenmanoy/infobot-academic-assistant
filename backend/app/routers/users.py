from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, Subject, User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import ManagerUser, hash_password

router = APIRouter(prefix="/users", tags=["Users"])

DbSession = Annotated[Session, Depends(get_db)]

# Which roles each manager role may create, edit or delete.
_MANAGEABLE = {
    Role.ADMIN: {Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT},
    Role.HOD: {Role.TEACHER, Role.STUDENT},
}


def _ensure_can_manage(actor: User, role: Role) -> None:
    if role not in _MANAGEABLE[actor.role]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You cannot manage {role.value} accounts")


def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _ensure_unique(db: Session, username: str | None, identifier: str | None, exclude_id: int | None = None) -> None:
    if username is not None:
        existing = db.scalar(select(User).where(User.username == username))
        if existing is not None and existing.id != exclude_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken")
    if identifier is not None:
        existing = db.scalar(select(User).where(User.identifier == identifier))
        if existing is not None and existing.id != exclude_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="That ID / register number is already used"
            )


def _ensure_not_last_admin(db: Session, user: User) -> None:
    if user.role != Role.ADMIN or not user.is_active:
        return
    others = db.scalar(
        select(User.id).where(User.role == Role.ADMIN, User.is_active.is_(True), User.id != user.id).limit(1)
    )
    if others is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This is the last active admin account")


@router.get("", response_model=list[UserOut])
def list_users(
    actor: ManagerUser,
    db: DbSession,
    role: Annotated[list[Role] | None, Query()] = None,
    semester: Annotated[int | None, Query(ge=1, le=8)] = None,
) -> list[User]:
    query = select(User).order_by(User.first_name, User.last_name)
    visible = _MANAGEABLE[actor.role] | {actor.role}
    roles = [r for r in (role or visible) if r in visible]
    query = query.where(User.role.in_(roles))
    if semester is not None:
        query = query.where(User.semester == semester)
    return list(db.scalars(query))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, actor: ManagerUser, db: DbSession) -> User:
    _ensure_can_manage(actor, data.role)
    _ensure_unique(db, data.username, data.identifier)
    fields = data.model_dump(exclude={"password"})
    user = User(**fields, password_hash=hash_password(data.password), preferences={})
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, actor: ManagerUser, db: DbSession) -> User:
    user = _get_user(db, user_id)
    _ensure_can_manage(actor, user.role)
    changes = data.model_dump(exclude_unset=True)

    if "role" in changes and changes["role"] is not None and changes["role"] != user.role:
        if user.id == actor.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")
        _ensure_can_manage(actor, changes["role"])
    if changes.get("is_active") is False and user.id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    if changes.get("is_active") is False or changes.get("role") not in (None, Role.ADMIN):
        _ensure_not_last_admin(db, user)
    _ensure_unique(db, changes.get("username"), changes.get("identifier"), exclude_id=user.id)

    password = changes.pop("password", None)
    for field in ("username", "first_name", "last_name", "role", "is_active"):
        # These columns are NOT NULL; a null in a partial update means "leave unchanged".
        if field in changes and changes[field] is None:
            changes.pop(field)
    for field, value in changes.items():
        setattr(user, field, value)

    if user.role == Role.STUDENT:
        if user.semester is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Students need a semester")
        user.teacher_type = None
        user.unavailable_slots = []
    else:
        user.semester = None

    if password:
        user.password_hash = hash_password(password)
    if password or changes.get("is_active") is False or "role" in changes:
        # Force a fresh login with the new credentials / permissions.
        user.token_version += 1

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, actor: ManagerUser, db: DbSession) -> None:
    user = _get_user(db, user_id)
    _ensure_can_manage(actor, user.role)
    if user.id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")
    _ensure_not_last_admin(db, user)
    # Unassign the teacher from their subjects (also enforced by ON DELETE SET NULL).
    for subject in db.scalars(select(Subject).where(Subject.teacher_id == user.id)):
        subject.teacher_id = None
    db.delete(user)
    db.commit()
