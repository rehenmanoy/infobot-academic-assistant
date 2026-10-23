"""Create the first admin account and, optionally, a demo dataset.

python -m app.seed --admin-username admin --admin-password '<strong password>'
python -m app.seed --demo            # fictional staff, students, subjects and timetables
"""

import argparse
import getpass
import logging
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scheduler
from app.models import Role, Subject, SubjectType, TeacherType, Timetable, User
from app.schemas import _check_password
from app.security import hash_password
from app.services import all_specs, busy_map, spec, subjects_for

logger = logging.getLogger(__name__)


def ensure_admin(db: Session, username: str, password: str) -> bool:
    """Create an admin if no admin exists yet. Returns True when one was created."""
    if db.scalar(select(User.id).where(User.role == Role.ADMIN).limit(1)) is not None:
        return False
    _check_password(password)  # raises ValueError for weak passwords
    db.add(
        User(
            username=username,
            first_name="System",
            last_name="Administrator",
            role=Role.ADMIN,
            password_hash=hash_password(password),
            preferences={},
            unavailable_slots=[],
        )
    )
    db.commit()
    logger.info("Created admin account %r", username)
    return True


# Fictional people and a KTU-style IT curriculum, used only for demos.
DEMO_TEACHERS = [
    ("anita.nair", "Anita", "Nair", Role.HOD, TeacherType.DEPARTMENTAL, "EMP1001"),
    ("rahul.menon", "Rahul", "Menon", Role.TEACHER, TeacherType.DEPARTMENTAL, "EMP1002"),
    ("divya.thomas", "Divya", "Thomas", Role.TEACHER, TeacherType.DEPARTMENTAL, "EMP1003"),
    ("arjun.pillai", "Arjun", "Pillai", Role.TEACHER, TeacherType.DEPARTMENTAL, "EMP1004"),
    ("meera.joseph", "Meera", "Joseph", Role.TEACHER, TeacherType.DEPARTMENTAL, "EMP1005"),
    ("kiran.das", "Kiran", "Das", Role.TEACHER, TeacherType.DEPARTMENTAL, "EMP1006"),
    ("sara.mathew", "Sara", "Mathew", Role.TEACHER, TeacherType.NON_DEPARTMENTAL, "EMP1007"),
    ("vivek.kurian", "Vivek", "Kurian", Role.TEACHER, TeacherType.NON_DEPARTMENTAL, "EMP1008"),
]

# (semester, code, name, notation, type, teacher username, L, T, P, credits)
DEMO_SUBJECTS = [
    (3, "MAT203", "Discrete Mathematical Structures", "DMS", SubjectType.CORE, "sara.mathew", 3, 1, 0, 4),
    (3, "ITT201", "Data Structures", "DS", SubjectType.CORE, "rahul.menon", 3, 1, 0, 4),
    (3, "ITT203", "Digital System Design", "DSD", SubjectType.CORE, "divya.thomas", 3, 1, 0, 4),
    (3, "ITT205", "Problem Solving Using Python", "PSP", SubjectType.CORE, "arjun.pillai", 3, 1, 0, 4),
    (3, "EST200", "Design and Engineering", "DE", SubjectType.CORE, "vivek.kurian", 2, 0, 0, 2),
    (3, "MCN201", "Sustainable Engineering", "SE", SubjectType.NON_CREDIT, "meera.joseph", 2, 0, 0, 0),
    (3, "ITL201", "Data Structures Lab", "DSL", SubjectType.LAB, "rahul.menon", 0, 0, 3, 2),
    (3, "ITL203", "Python Programming Lab", "PPL", SubjectType.LAB, "arjun.pillai", 0, 0, 3, 2),
    (5, "ITT301", "Formal Languages and Automata", "FLAT", SubjectType.CORE, "anita.nair", 3, 1, 0, 4),
    (5, "ITT303", "Operating Systems", "OS", SubjectType.CORE, "kiran.das", 3, 1, 0, 4),
    (5, "ITT305", "Database Management Systems", "DBMS", SubjectType.CORE, "divya.thomas", 3, 1, 0, 4),
    (5, "ITT307", "Computer Networks", "CN", SubjectType.CORE, "meera.joseph", 3, 1, 0, 4),
    (5, "HUT300", "Industrial Economics", "IE", SubjectType.CORE, "vivek.kurian", 3, 0, 0, 3),
    (5, "MCN301", "Disaster Management", "DM", SubjectType.NON_CREDIT, "sara.mathew", 2, 0, 0, 0),
    (5, "ITL331", "Operating Systems Lab", "OSL", SubjectType.LAB, "kiran.das", 0, 0, 3, 2),
    (5, "ITL333", "DBMS Lab", "DBL", SubjectType.LAB, "divya.thomas", 0, 0, 3, 2),
]


def load_demo(db: Session, password: str) -> None:
    if db.scalar(select(Subject.id).limit(1)) is not None:
        logger.info("Subjects already exist; skipping demo data")
        return
    password_hash = hash_password(password)
    teachers: dict[str, User] = {}
    for username, first, last, role, teacher_type, identifier in DEMO_TEACHERS:
        teacher = User(
            username=username,
            first_name=first,
            last_name=last,
            role=role,
            teacher_type=teacher_type,
            identifier=identifier,
            password_hash=password_hash,
            preferences={},
            unavailable_slots=[],
        )
        teachers[username] = teacher
        db.add(teacher)
    # Non-departmental staff also teach elsewhere: block Monday morning for one of them.
    teachers["vivek.kurian"].unavailable_slots = [[0, 0], [0, 1], [0, 2], [0, 3]]

    for semester, number in ((3, 1), (3, 2), (5, 1), (5, 2)):
        db.add(
            User(
                username=f"student.s{semester}.{number}",
                first_name="Demo",
                last_name=f"Student S{semester}-{number}",
                role=Role.STUDENT,
                semester=semester,
                identifier=f"REG{semester}0{number}",
                password_hash=password_hash,
                preferences={},
                unavailable_slots=[],
            )
        )
    db.flush()

    for semester, code, name, notation, subject_type, teacher, lecture, tutorial, practical, credits in DEMO_SUBJECTS:
        db.add(
            Subject(
                semester=semester,
                code=code,
                name=name,
                notation=notation,
                type=subject_type,
                teacher_id=teachers[teacher].id,
                lecture_hours=lecture,
                tutorial_hours=tutorial,
                practical_hours=practical,
                credits=credits,
            )
        )
    db.flush()

    # Generate semester 3 first, then semester 5 around it, exactly like the app does.
    for semester in (3, 5):
        specs = all_specs(db)
        result = scheduler.generate(
            [spec(s) for s in subjects_for(db, semester)], busy_map(db, semester, specs), seed=semester
        )
        db.add(Timetable(semester=semester, grid=result.grid))
        db.flush()
    db.commit()
    logger.info(
        "Loaded demo data: %d staff, 4 students, %d subjects, 2 timetables", len(DEMO_TEACHERS), len(DEMO_SUBJECTS)
    )


def main(argv: list[str] | None = None) -> int:
    from app.config import get_settings
    from app.database import Base, SessionLocal, engine

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--admin-username", default=get_settings().admin_username)
    parser.add_argument("--admin-password", default=get_settings().admin_password)
    parser.add_argument("--demo", action="store_true", help="load fictional demo data")
    parser.add_argument("--demo-password", help="password for every demo account (asked for if omitted)")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if args.admin_username:
            password = args.admin_password or getpass.getpass(f"Password for admin {args.admin_username!r}: ")
            if not ensure_admin(db, args.admin_username, password):
                logger.info("An admin already exists; not creating another")
        if args.demo:
            demo_password = args.demo_password or getpass.getpass("Password for the demo accounts: ")
            if len(demo_password) < 8:
                logger.error("Demo password must be at least 8 characters")
                return 1
            load_demo(db, demo_password)
    return 0


if __name__ == "__main__":
    sys.exit(main())
