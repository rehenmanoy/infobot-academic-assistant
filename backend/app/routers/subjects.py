import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import STAFF_ROLES, Subject, User
from app.scheduler import LAB_BLOCK, NUM_DAYS, NUM_PERIODS
from app.schemas import SubjectCreate, SubjectOut, SubjectUpdate
from app.security import CurrentUser, ManagerUser
from app.services import remove_subject_from_grids, subject_out, subjects_for

router = APIRouter(prefix="/subjects", tags=["Subjects"])

DbSession = Annotated[Session, Depends(get_db)]


def _get_subject(db: Session, subject_id: int) -> Subject:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


def _check_teacher(db: Session, teacher_id: int | None) -> None:
    if teacher_id is None:
        return
    teacher = db.get(User, teacher_id)
    if teacher is None or teacher.role not in STAFF_ROLES or not teacher.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Teacher must be an active teacher or HOD"
        )


def _check_hours(db: Session, semester: int, practical: int, theory: int, exclude_id: int | None = None) -> None:
    if practical % LAB_BLOCK:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Practical hours must be a multiple of {LAB_BLOCK} (labs run as {LAB_BLOCK}-period blocks)",
        )
    used = sum(s.theory_hours + s.practical_hours for s in subjects_for(db, semester) if s.id != exclude_id)
    capacity = NUM_DAYS * NUM_PERIODS
    if used + practical + theory > capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Semester {semester} would need {used + practical + theory} periods a week but only {capacity} exist",
        )


def _ensure_unique_code(db: Session, semester: int, code: str, exclude_id: int | None = None) -> None:
    existing = db.scalar(select(Subject).where(Subject.semester == semester, Subject.code == code))
    if existing is not None and existing.id != exclude_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"{code} already exists in semester {semester}"
        )


@router.get("", response_model=list[SubjectOut])
def list_subjects(
    _user: CurrentUser,
    db: DbSession,
    semester: Annotated[int | None, Query(ge=1, le=8)] = None,
) -> list[SubjectOut]:
    query = select(Subject).order_by(Subject.semester, Subject.code)
    if semester is not None:
        query = query.where(Subject.semester == semester)
    return [subject_out(s) for s in db.scalars(query)]


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, _actor: ManagerUser, db: DbSession) -> SubjectOut:
    _check_teacher(db, data.teacher_id)
    _ensure_unique_code(db, data.semester, data.code)
    _check_hours(db, data.semester, data.practical_hours, data.lecture_hours + data.tutorial_hours)
    subject = Subject(**data.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject_out(subject)


@router.patch("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, data: SubjectUpdate, _actor: ManagerUser, db: DbSession) -> SubjectOut:
    subject = _get_subject(db, subject_id)
    changes = data.model_dump(exclude_unset=True)
    # Nullable only for teacher_id; for every other field null means "unchanged".
    changes = {k: v for k, v in changes.items() if v is not None or k == "teacher_id"}

    if "teacher_id" in changes:
        _check_teacher(db, changes["teacher_id"])
    if "code" in changes:
        _ensure_unique_code(db, subject.semester, changes["code"], exclude_id=subject.id)
    lecture = changes.get("lecture_hours", subject.lecture_hours)
    tutorial = changes.get("tutorial_hours", subject.tutorial_hours)
    practical = changes.get("practical_hours", subject.practical_hours)
    _check_hours(db, subject.semester, practical, lecture + tutorial, exclude_id=subject.id)

    for field, value in changes.items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject_out(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, _actor: ManagerUser, db: DbSession) -> None:
    subject = _get_subject(db, subject_id)
    remove_subject_from_grids(db, subject)
    stored = subject.syllabus_file
    db.delete(subject)
    db.commit()
    if stored:
        (get_settings().upload_dir / stored).unlink(missing_ok=True)


# ----------------------------------------------------------------------------- syllabus files


def _syllabus_path(stored_name: str) -> Path:
    upload_dir = get_settings().upload_dir.resolve()
    path = (upload_dir / stored_name).resolve()
    if path.parent != upload_dir:  # stored names are generated by us, but never trust a path
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return path


@router.put("/{subject_id}/syllabus", response_model=SubjectOut)
async def upload_syllabus(
    subject_id: int,
    file: Annotated[UploadFile, File(description="Syllabus PDF")],
    _actor: ManagerUser,
    db: DbSession,
) -> SubjectOut:
    subject = _get_subject(db, subject_id)
    settings = get_settings()
    limit = settings.max_upload_mb * 1024 * 1024
    content = await file.read(limit + 1)
    if len(content) > limit:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File must be {settings.max_upload_mb} MB or smaller",
        )
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF files are accepted")

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    # The stored name is random; the user's file name is kept only as display metadata.
    stored_name = f"{uuid.uuid4().hex}.pdf"
    _syllabus_path(stored_name).write_bytes(content)

    old = subject.syllabus_file
    subject.syllabus_file = stored_name
    subject.syllabus_name = Path(file.filename or "syllabus.pdf").name[:255]
    db.commit()
    if old:
        _syllabus_path(old).unlink(missing_ok=True)
    db.refresh(subject)
    return subject_out(subject)


@router.get("/{subject_id}/syllabus")
def download_syllabus(subject_id: int, _user: CurrentUser, db: DbSession) -> FileResponse:
    subject = _get_subject(db, subject_id)
    if not subject.syllabus_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This subject has no syllabus")
    path = _syllabus_path(subject.syllabus_file)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path, media_type="application/pdf", filename=subject.syllabus_name or "syllabus.pdf")
