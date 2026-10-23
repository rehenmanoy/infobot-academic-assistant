from collections import defaultdict
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scheduler
from app.database import get_db
from app.models import STAFF_ROLES, Role, Subject, Timetable, User
from app.schemas import (
    ConflictOut,
    GenerateRequest,
    GridRequest,
    IssueOut,
    ScheduleEntry,
    TeacherRef,
    TimetableOut,
    TimetableSummary,
    UnplacedOut,
)
from app.security import CurrentUser, ManagerUser
from app.services import all_specs, busy_map, issues_for, spec, subject_out, subjects_for

router = APIRouter(prefix="/timetables", tags=["Timetables"])

DbSession = Annotated[Session, Depends(get_db)]
SemesterPath = Annotated[int, Path(ge=1, le=8)]


def _saved(db: Session, semester: int) -> Timetable | None:
    return db.scalar(select(Timetable).where(Timetable.semester == semester))


def _ensure_can_view(user: User, semester: int) -> None:
    if user.role == Role.STUDENT and user.semester != semester:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own semester")


def _timetable_out(db: Session, semester: int, grid: scheduler.Grid, saved: Timetable | None) -> TimetableOut:
    return TimetableOut(
        semester=semester,
        grid=grid,
        subjects=[subject_out(s) for s in subjects_for(db, semester)],
        issues=issues_for(db, semester, grid),
        saved=saved is not None,
        updated_at=saved.updated_at if saved else None,
    )


# --------------------------------------------------------------------------- static routes first


@router.get("/config")
def timetable_config(_user: CurrentUser) -> dict:
    return {
        "days": scheduler.DAYS,
        "periods": [{"number": i + 1, "start": start, "end": end} for i, (start, end) in enumerate(scheduler.PERIODS)],
        "sessions": scheduler.SESSIONS,
        "lab_block": scheduler.LAB_BLOCK,
        "lab_start_periods": scheduler.lab_start_periods(),
    }


@router.get("", response_model=list[TimetableSummary])
def list_timetables(_user: CurrentUser, db: DbSession) -> list[TimetableSummary]:
    summaries = []
    for timetable in db.scalars(select(Timetable).order_by(Timetable.semester)):
        issues = issues_for(db, timetable.semester, timetable.grid)
        summaries.append(
            TimetableSummary(
                semester=timetable.semester,
                updated_at=timetable.updated_at,
                filled_periods=sum(1 for row in timetable.grid for cell in row if cell),
                errors=sum(1 for i in issues if i.severity == "error"),
                warnings=sum(1 for i in issues if i.severity == "warning"),
            )
        )
    return summaries


@router.get("/conflicts", response_model=list[ConflictOut])
def conflicts(_actor: ManagerUser, db: DbSession) -> list[ConflictOut]:
    """Every teacher clash across all saved timetables, re-checked against current subject data.

    A saved timetable can become invalid later, e.g. when a subject is given a different teacher.
    """
    specs = all_specs(db)
    taken: dict[tuple[int, int, int, int], list[int]] = defaultdict(list)  # (term, teacher, day, period) -> semesters
    for timetable in db.scalars(select(Timetable)):
        for teacher_id, slots in scheduler.teacher_slots(timetable.grid, specs).items():
            for day, period in slots:
                taken[(timetable.semester % 2, teacher_id, day, period)].append(timetable.semester)

    teachers = {t.id: t for t in db.scalars(select(User).where(User.role.in_(STAFF_ROLES)))}
    found: list[ConflictOut] = []
    for (_term, teacher_id, day, period), semesters in sorted(taken.items()):
        teacher = teachers.get(teacher_id)
        if teacher is None:
            continue
        ref = TeacherRef(id=teacher.id, full_name=teacher.full_name)
        if len(semesters) > 1:
            found.append(ConflictOut(teacher=ref, day=day, period=period, semesters=sorted(semesters), type="clash"))
        if [day, period] in (teacher.unavailable_slots or []):
            found.append(
                ConflictOut(teacher=ref, day=day, period=period, semesters=sorted(semesters), type="unavailable")
            )
    return found


@router.get("/teachers/{teacher_id}", response_model=list[ScheduleEntry])
def teacher_schedule(
    teacher_id: int,
    user: CurrentUser,
    db: DbSession,
    term: Annotated[Literal["odd", "even"] | None, Query()] = None,
) -> list[ScheduleEntry]:
    if user.role not in (Role.ADMIN, Role.HOD) and user.id != teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own schedule")
    subjects = {s.id: s for s in db.scalars(select(Subject).where(Subject.teacher_id == teacher_id))}
    entries: list[ScheduleEntry] = []
    for timetable in db.scalars(select(Timetable).order_by(Timetable.semester)):
        if term is not None and (timetable.semester % 2 == 1) != (term == "odd"):
            continue
        for day, row in enumerate(timetable.grid):
            for period, cell in enumerate(row):
                subject = subjects.get(cell["subject_id"]) if cell else None
                if subject is None:
                    continue
                entries.append(
                    ScheduleEntry(
                        day=day,
                        period=period,
                        semester=timetable.semester,
                        subject_id=subject.id,
                        code=subject.code,
                        name=subject.name,
                        kind=cell["kind"],
                    )
                )
    return entries


# --------------------------------------------------------------------------- per-semester routes


@router.get("/{semester}", response_model=TimetableOut)
def get_timetable(semester: SemesterPath, user: CurrentUser, db: DbSession) -> TimetableOut:
    _ensure_can_view(user, semester)
    saved = _saved(db, semester)
    return _timetable_out(db, semester, saved.grid if saved else scheduler.empty_grid(), saved)


@router.post("/{semester}/generate", response_model=TimetableOut)
def generate_timetable(
    semester: SemesterPath, data: GenerateRequest, _actor: ManagerUser, db: DbSession
) -> TimetableOut:
    """Propose a clash-free timetable. Nothing is saved until the grid is PUT back."""
    subjects = subjects_for(db, semester)
    if not subjects:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Semester {semester} has no subjects yet"
        )
    specs = all_specs(db)
    try:
        result = scheduler.generate([spec(s) for s in subjects], busy_map(db, semester, specs), seed=data.seed)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from None

    codes = {s.id: s.code for s in subjects}
    out = _timetable_out(db, semester, result.grid, None)
    out.unplaced = [
        UnplacedOut(subject_id=u.subject_id, code=codes[u.subject_id], kind=u.kind, count=u.count)
        for u in result.unplaced
    ]
    return out


@router.post("/{semester}/validate", response_model=list[IssueOut])
def validate_timetable(semester: SemesterPath, data: GridRequest, _actor: ManagerUser, db: DbSession) -> list[IssueOut]:
    return issues_for(db, semester, data.as_plain())


@router.put("/{semester}", response_model=TimetableOut, responses={409: {"description": "The grid has clashes"}})
def save_timetable(semester: SemesterPath, data: GridRequest, actor: ManagerUser, db: DbSession):
    grid = data.as_plain()
    issues = issues_for(db, semester, grid)
    errors = [i for i in issues if i.severity == "error"]
    if errors:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "The timetable has clashes and was not saved",
                "issues": [e.model_dump() for e in errors],
            },
        )
    saved = _saved(db, semester)
    if saved is None:
        saved = Timetable(semester=semester, grid=grid, updated_by_id=actor.id)
        db.add(saved)
    else:
        saved.grid = grid
        saved.updated_by_id = actor.id
    db.commit()
    db.refresh(saved)
    return _timetable_out(db, semester, saved.grid, saved)


@router.delete("/{semester}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable(semester: SemesterPath, _actor: ManagerUser, db: DbSession) -> None:
    saved = _saved(db, semester)
    if saved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saved timetable for this semester")
    db.delete(saved)
    db.commit()
