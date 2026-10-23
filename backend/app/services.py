"""Helpers that connect the database models to the pure scheduler."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scheduler
from app.models import STAFF_ROLES, Subject, Timetable, User
from app.scheduler import BusyReason, SubjectSpec
from app.schemas import IssueOut, SubjectOut, TeacherRef


def subject_out(subject: Subject) -> SubjectOut:
    teacher = subject.teacher
    return SubjectOut(
        id=subject.id,
        semester=subject.semester,
        code=subject.code,
        name=subject.name,
        notation=subject.notation,
        type=subject.type,
        teacher=TeacherRef(id=teacher.id, full_name=teacher.full_name) if teacher else None,
        lecture_hours=subject.lecture_hours,
        tutorial_hours=subject.tutorial_hours,
        practical_hours=subject.practical_hours,
        credits=subject.credits,
        syllabus_name=subject.syllabus_name,
    )


def spec(subject: Subject) -> SubjectSpec:
    return SubjectSpec(
        id=subject.id,
        code=subject.code,
        teacher_id=subject.teacher_id,
        theory_hours=subject.theory_hours,
        practical_hours=subject.practical_hours,
    )


def subjects_for(db: Session, semester: int) -> list[Subject]:
    return list(db.scalars(select(Subject).where(Subject.semester == semester).order_by(Subject.code)))


def all_specs(db: Session) -> dict[int, SubjectSpec]:
    return {subject.id: spec(subject) for subject in db.scalars(select(Subject))}


def busy_map(db: Session, semester: int, specs: dict[int, SubjectSpec] | None = None) -> scheduler.Busy:
    """Slots already taken for each teacher, from the other classes of the same term
    and from each teacher's own unavailable slots."""
    specs = specs if specs is not None else all_specs(db)
    busy: scheduler.Busy = {}
    for timetable in db.scalars(select(Timetable).where(Timetable.semester != semester)):
        if not scheduler.same_term(timetable.semester, semester):
            continue
        reason = BusyReason(kind="class", label=f"Semester {timetable.semester}", semester=timetable.semester)
        for teacher_id, slots in scheduler.teacher_slots(timetable.grid, specs).items():
            for slot in slots:
                busy.setdefault(teacher_id, {})[slot] = reason
    unavailable = BusyReason(kind="unavailable", label="unavailable")
    for teacher in db.scalars(select(User).where(User.role.in_(STAFF_ROLES))):
        for day, period in teacher.unavailable_slots or []:
            busy.setdefault(teacher.id, {}).setdefault((day, period), unavailable)
    return busy


def issues_for(db: Session, semester: int, grid: scheduler.Grid) -> list[IssueOut]:
    specs = all_specs(db)
    own = {sid: s for sid, s in specs.items() if sid in {sub.id for sub in subjects_for(db, semester)}}
    issues = scheduler.validate(grid, own, busy_map(db, semester, specs))
    return [IssueOut(**issue.__dict__) for issue in issues]


def remove_subject_from_grids(db: Session, subject: Subject) -> None:
    timetable = db.scalar(select(Timetable).where(Timetable.semester == subject.semester))
    if timetable is None:
        return
    timetable.grid = [
        [None if cell and cell["subject_id"] == subject.id else cell for cell in row] for row in timetable.grid
    ]
