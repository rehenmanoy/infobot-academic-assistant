import os
import shutil
import tempfile
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest

# Configure the app before it is imported anywhere.
_TMP = Path(tempfile.mkdtemp(prefix="infobot-tests-"))
os.environ.update(
    {
        "APP_ENV": "test",
        "SECRET_KEY": "test-secret-key-for-the-infobot-test-suite-0123456789",
        "DATABASE_URL": f"sqlite:///{(_TMP / 'test.db').as_posix()}",
        "UPLOAD_DIR": str(_TMP / "uploads"),
        "ANTHROPIC_API_KEY": "",
        "ADMIN_USERNAME": "",
        "ADMIN_PASSWORD": "",
    }
)

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Role, Subject, SubjectType, TeacherType, User  # noqa: E402
from app.routers.auth import login_limiter  # noqa: E402
from app.routers.chat import chat_limiter  # noqa: E402
from app.security import hash_password  # noqa: E402

PASSWORD = "Passw0rd!x"
_PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture(autouse=True)
def _fresh_database() -> Iterator[None]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    shutil.rmtree(_TMP / "uploads", ignore_errors=True)
    login_limiter.reset()
    chat_limiter.reset()
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def make_user(db: Session) -> Callable[..., User]:
    counter = iter(range(1, 10_000))

    def factory(role: Role = Role.TEACHER, username: str | None = None, **fields) -> User:
        n = next(counter)
        defaults = {
            "username": username or f"{role.value}{n}",
            "first_name": role.value.title(),
            "last_name": f"User{n}",
            "role": role,
            "password_hash": _PASSWORD_HASH,
            "preferences": {},
            "unavailable_slots": [],
        }
        if role == Role.STUDENT:
            defaults["semester"] = 3
        if role in (Role.TEACHER, Role.HOD):
            defaults["teacher_type"] = TeacherType.DEPARTMENTAL
        user = User(**(defaults | fields))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return factory


@pytest.fixture
def make_subject(db: Session) -> Callable[..., Subject]:
    counter = iter(range(1, 10_000))

    def factory(semester: int, teacher: User | None, theory: int = 3, practical: int = 0, **fields) -> Subject:
        n = next(counter)
        subject = Subject(
            semester=semester,
            code=fields.pop("code", f"SUB{semester}{n:02d}"),
            name=fields.pop("name", f"Subject {n}"),
            notation=fields.pop("notation", f"S{n}"),
            type=SubjectType.LAB if practical and not theory else SubjectType.CORE,
            teacher_id=teacher.id if teacher else None,
            lecture_hours=theory,
            tutorial_hours=0,
            practical_hours=practical,
            credits=3,
            **fields,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    return factory


@pytest.fixture
def login(client: TestClient) -> Callable[[User], dict[str, str]]:
    def do_login(user: User) -> dict[str, str]:
        response = client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return do_login


@pytest.fixture
def admin(make_user) -> User:
    return make_user(Role.ADMIN, username="admin")


@pytest.fixture
def admin_headers(admin, login) -> dict[str, str]:
    return login(admin)
