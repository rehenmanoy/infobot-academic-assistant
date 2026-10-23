import base64
import binascii
import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from app.models import Role, SubjectType, TeacherType
from app.scheduler import NUM_DAYS, NUM_PERIODS
from app.security import MAX_PASSWORD_BYTES

Username = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.@-]+$")
]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Identifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Semester = Annotated[int, Field(ge=1, le=8)]

MAX_PHOTO_BYTES = 512 * 1024
_PHOTO_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$")
_IMAGE_MAGIC = {
    "png": (b"\x89PNG\r\n\x1a\n",),
    "jpeg": (b"\xff\xd8\xff",),
    "webp": (b"RIFF",),
}


def _check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes")
    if value.isdigit() or value.isalpha():
        raise ValueError("Password must mix letters with numbers or symbols")
    return value


def _check_photo(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    match = _PHOTO_RE.match(value)
    if not match:
        raise ValueError("Photo must be a PNG, JPEG or WebP data URL")
    try:
        data = base64.b64decode(match.group(2), validate=False)
    except (binascii.Error, ValueError):
        raise ValueError("Photo is not valid base64") from None
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("Photo must be 512 KB or smaller")
    if not data.startswith(_IMAGE_MAGIC[match.group(1)]):
        raise ValueError("Photo content does not match its image type")
    return value


def _check_slots(value: list[list[int]] | None) -> list[list[int]] | None:
    if value is None:
        return None
    cleaned = set()
    for slot in value:
        if len(slot) != 2 or not (0 <= slot[0] < NUM_DAYS and 0 <= slot[1] < NUM_PERIODS):
            raise ValueError("Each unavailable slot must be [day, period] inside the week")
        cleaned.add((slot[0], slot[1]))
    return [list(slot) for slot in sorted(cleaned)]


Password = Annotated[str, AfterValidator(_check_password)]
Photo = Annotated[str | None, AfterValidator(_check_photo)]
Slots = Annotated[list[list[int]], AfterValidator(_check_slots)]


# ----------------------------------------------------------------------------- auth


class LoginRequest(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: str
    last_name: str
    full_name: str
    role: Role
    identifier: str | None
    semester: int | None
    teacher_type: TeacherType | None
    unavailable_slots: list[list[int]]
    photo: str | None
    is_active: bool
    preferences: dict
    last_login_at: datetime | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: Password


class PreferencesUpdate(BaseModel):
    theme: Literal["light", "dark"]
    color: Literal["zinc", "red", "rose", "orange", "green", "blue", "yellow", "violet"]


# ----------------------------------------------------------------------------- users


class UserCreate(BaseModel):
    username: Username
    password: Password
    first_name: Name
    last_name: Name
    role: Role
    identifier: Identifier | None = None
    semester: Semester | None = None
    teacher_type: TeacherType | None = None
    unavailable_slots: Slots = Field(default_factory=list)
    photo: Photo = None
    is_active: bool = True

    @model_validator(mode="after")
    def _role_fields(self) -> "UserCreate":
        if self.role == Role.STUDENT:
            if self.semester is None:
                raise ValueError("Students need a semester")
            self.teacher_type = None
            self.unavailable_slots = []
        else:
            self.semester = None
            if self.role in (Role.TEACHER, Role.HOD) and self.teacher_type is None:
                self.teacher_type = TeacherType.DEPARTMENTAL
        return self


class UserUpdate(BaseModel):
    """Partial update; only the fields that are sent are changed."""

    username: Username | None = None
    password: str | None = None
    first_name: Name | None = None
    last_name: Name | None = None
    role: Role | None = None
    identifier: Identifier | None = None
    semester: Semester | None = None
    teacher_type: TeacherType | None = None
    unavailable_slots: Slots | None = None
    photo: Photo = None
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def _password(cls, value: str | None) -> str | None:
        # An empty password in an edit form means "keep the current password".
        return None if not value else _check_password(value)


# ----------------------------------------------------------------------------- subjects


class TeacherRef(BaseModel):
    id: int
    full_name: str


class SubjectBase(BaseModel):
    code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    notation: Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)] = ""
    type: SubjectType
    teacher_id: int | None = None
    lecture_hours: int = Field(default=0, ge=0, le=10)
    tutorial_hours: int = Field(default=0, ge=0, le=10)
    practical_hours: int = Field(default=0, ge=0, le=12)
    credits: int = Field(default=0, ge=0, le=10)


class SubjectCreate(SubjectBase):
    semester: Semester


class SubjectUpdate(BaseModel):
    code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)] | None = None
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)] | None = None
    notation: Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)] | None = None
    type: SubjectType | None = None
    teacher_id: int | None = None
    lecture_hours: int | None = Field(default=None, ge=0, le=10)
    tutorial_hours: int | None = Field(default=None, ge=0, le=10)
    practical_hours: int | None = Field(default=None, ge=0, le=12)
    credits: int | None = Field(default=None, ge=0, le=10)


class SubjectOut(BaseModel):
    id: int
    semester: int
    code: str
    name: str
    notation: str
    type: SubjectType
    teacher: TeacherRef | None
    lecture_hours: int
    tutorial_hours: int
    practical_hours: int
    credits: int
    syllabus_name: str | None


# ----------------------------------------------------------------------------- timetables


class Cell(BaseModel):
    subject_id: int
    kind: Literal["theory", "lab"]


GridIn = Annotated[
    list[Annotated[list[Cell | None], Field(min_length=NUM_PERIODS, max_length=NUM_PERIODS)]],
    Field(min_length=NUM_DAYS, max_length=NUM_DAYS),
]


class GridRequest(BaseModel):
    grid: GridIn

    def as_plain(self) -> list[list[dict | None]]:
        return [[cell.model_dump() if cell else None for cell in row] for row in self.grid]


class GenerateRequest(BaseModel):
    seed: int | None = Field(default=None, ge=0, le=2**31)


class IssueOut(BaseModel):
    type: str
    severity: Literal["error", "warning"]
    message: str
    day: int | None = None
    period: int | None = None
    subject_id: int | None = None
    teacher_id: int | None = None
    other_semester: int | None = None


class UnplacedOut(BaseModel):
    subject_id: int
    code: str
    kind: Literal["theory", "lab"]
    count: int


class TimetableOut(BaseModel):
    semester: int
    grid: list[list[dict | None]]
    subjects: list[SubjectOut]
    issues: list[IssueOut]
    saved: bool
    updated_at: datetime | None = None
    unplaced: list[UnplacedOut] = Field(default_factory=list)


class TimetableSummary(BaseModel):
    semester: int
    updated_at: datetime
    filled_periods: int
    errors: int
    warnings: int


class ScheduleEntry(BaseModel):
    day: int
    period: int
    semester: int
    subject_id: int
    code: str
    name: str
    kind: Literal["theory", "lab"]


class ConflictOut(BaseModel):
    teacher: TeacherRef
    day: int
    period: int
    semesters: list[int]
    type: Literal["clash", "unavailable"]


# ----------------------------------------------------------------------------- chat & prompts


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(min_length=1, max_length=4000)]


class ChatRequest(BaseModel):
    messages: Annotated[list[ChatMessage], Field(min_length=1, max_length=20)]

    @model_validator(mode="after")
    def _ends_with_user(self) -> "ChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("The last message must come from the user")
        return self


class ChatResponse(BaseModel):
    reply: str


class PromptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    text: str
    updated_at: datetime


class PromptUpdate(BaseModel):
    text: Annotated[str, StringConstraints(min_length=1, max_length=8000)]
