import enum
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Role(str, enum.Enum):
    ADMIN = "admin"
    HOD = "hod"
    TEACHER = "teacher"
    STUDENT = "student"


STAFF_ROLES = (Role.HOD, Role.TEACHER)


class TeacherType(str, enum.Enum):
    DEPARTMENTAL = "departmental"
    NON_DEPARTMENTAL = "non_departmental"


class SubjectType(str, enum.Enum):
    CORE = "core"
    ELECTIVE = "elective"
    LAB = "lab"
    NON_CREDIT = "non_credit"
    MINOR = "minor"


def _enum(enum_cls: type[enum.Enum]) -> Enum:
    # Store enum values as plain strings so the schema is portable across SQLite/MySQL/Postgres.
    return Enum(enum_cls, native_enum=False, length=32, values_callable=lambda e: [m.value for m in e])


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[Role] = mapped_column(_enum(Role), index=True)
    # Employee ID for staff, register number for students.
    identifier: Mapped[str | None] = mapped_column(String(50), unique=True)
    semester: Mapped[int | None] = mapped_column(Integer)
    teacher_type: Mapped[TeacherType | None] = mapped_column(_enum(TeacherType))
    # [[day, period], ...] slots in which a teacher cannot be scheduled (0-indexed).
    unavailable_slots: Mapped[list] = mapped_column(JSON, default=list)
    photo: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Bumped on logout / password change so previously issued tokens stop working.
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("semester", "code", name="uq_subject_semester_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    semester: Mapped[int] = mapped_column(Integer, index=True)
    code: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    notation: Mapped[str] = mapped_column(String(20), default="")
    type: Mapped[SubjectType] = mapped_column(_enum(SubjectType))
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    lecture_hours: Mapped[int] = mapped_column(Integer, default=0)
    tutorial_hours: Mapped[int] = mapped_column(Integer, default=0)
    practical_hours: Mapped[int] = mapped_column(Integer, default=0)
    credits: Mapped[int] = mapped_column(Integer, default=0)
    syllabus_file: Mapped[str | None] = mapped_column(String(64))
    syllabus_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    teacher: Mapped[User | None] = relationship(lazy="joined")

    @property
    def theory_hours(self) -> int:
        return self.lecture_hours + self.tutorial_hours


class Timetable(Base):
    """The saved weekly timetable of one semester (one class)."""

    __tablename__ = "timetables"

    id: Mapped[int] = mapped_column(primary_key=True)
    semester: Mapped[int] = mapped_column(Integer, unique=True)
    # grid[day][period] -> {"subject_id": int, "kind": "theory" | "lab"} or None
    grid: Mapped[list] = mapped_column(JSON)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    text: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
