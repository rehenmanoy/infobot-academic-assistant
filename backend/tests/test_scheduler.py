"""Unit tests for the pure scheduling engine."""

import random

import pytest

from app.scheduler import (
    LAB_BLOCK,
    NUM_DAYS,
    NUM_PERIODS,
    BusyReason,
    SubjectSpec,
    daily_theory_cap,
    empty_grid,
    generate,
    lab_start_periods,
    teacher_slots,
    validate,
)

SEM3 = [
    SubjectSpec(1, "MAT203", teacher_id=101, theory_hours=4, practical_hours=0),
    SubjectSpec(2, "ITT201", teacher_id=102, theory_hours=4, practical_hours=0),
    SubjectSpec(3, "ITT203", teacher_id=103, theory_hours=4, practical_hours=0),
    SubjectSpec(4, "ITT205", teacher_id=104, theory_hours=4, practical_hours=0),
    SubjectSpec(5, "EST200", teacher_id=105, theory_hours=2, practical_hours=0),
    SubjectSpec(6, "MCN201", teacher_id=106, theory_hours=2, practical_hours=0),
    SubjectSpec(7, "ITL201", teacher_id=102, theory_hours=0, practical_hours=3),
    SubjectSpec(8, "ITL203", teacher_id=104, theory_hours=0, practical_hours=3),
]
# Semester 5 shares four teachers with semester 3.
SEM5 = [
    SubjectSpec(11, "ITT301", teacher_id=107, theory_hours=4, practical_hours=0),
    SubjectSpec(12, "ITT303", teacher_id=108, theory_hours=4, practical_hours=0),
    SubjectSpec(13, "ITT305", teacher_id=103, theory_hours=4, practical_hours=0),
    SubjectSpec(14, "ITT307", teacher_id=106, theory_hours=4, practical_hours=0),
    SubjectSpec(15, "HUT300", teacher_id=105, theory_hours=3, practical_hours=0),
    SubjectSpec(16, "MCN301", teacher_id=101, theory_hours=2, practical_hours=0),
    SubjectSpec(17, "ITL331", teacher_id=108, theory_hours=0, practical_hours=3),
    SubjectSpec(18, "ITL333", teacher_id=103, theory_hours=0, practical_hours=3),
]


def by_id(subjects):
    return {s.id: s for s in subjects}


def busy_from(grid, subjects, semester):
    reason = BusyReason("class", f"Semester {semester}", semester)
    return {t: dict.fromkeys(slots, reason) for t, slots in teacher_slots(grid, by_id(subjects)).items()}


def test_generates_a_complete_valid_timetable():
    result = generate(SEM3, seed=7)
    assert result.complete
    assert validate(result.grid, by_id(SEM3)) == []


def test_same_seed_gives_same_timetable_and_different_seeds_vary():
    assert generate(SEM3, seed=1).grid == generate(SEM3, seed=1).grid
    grids = {str(generate(SEM3, seed=s).grid) for s in range(5)}
    assert len(grids) > 1


def test_labs_are_contiguous_blocks_inside_one_session():
    grid = generate(SEM3, seed=3).grid
    starts = set(lab_start_periods())
    for day in range(NUM_DAYS):
        period = 0
        while period < NUM_PERIODS:
            cell = grid[day][period]
            if cell and cell["kind"] == "lab":
                assert period in starts
                assert all(grid[day][period + k] == cell for k in range(LAB_BLOCK))
                period += LAB_BLOCK
            else:
                period += 1


def test_theory_hours_are_spread_across_the_week():
    grid = generate(SEM3, seed=11).grid
    for subject in SEM3:
        if subject.theory_hours:
            per_day = [
                sum(1 for c in row if c and c["subject_id"] == subject.id and c["kind"] == "theory") for row in grid
            ]
            assert max(per_day) <= daily_theory_cap(subject.theory_hours)


@pytest.mark.parametrize("seed", range(25))
def test_second_class_never_clashes_with_the_first(seed):
    """The core promise: shared teachers are never double-booked across classes."""
    first = generate(SEM3, seed=seed)
    busy = busy_from(first.grid, SEM3, 3)
    second = generate(SEM5, busy, seed=seed + 100)
    assert second.complete
    assert [i for i in validate(second.grid, by_id(SEM5), busy) if i.severity == "error"] == []

    used3 = teacher_slots(first.grid, by_id(SEM3))
    used5 = teacher_slots(second.grid, by_id(SEM5))
    for teacher in used3.keys() & used5.keys():
        assert not used3[teacher] & used5[teacher], f"teacher {teacher} double-booked"


def test_unavailable_slots_are_respected():
    blocked = {(day, period) for day in range(NUM_DAYS) for period in (0, 1, 2, 3)}
    busy = {101: dict.fromkeys(blocked, BusyReason("unavailable", "unavailable"))}
    grid = generate(SEM3, busy, seed=5).grid
    assert not teacher_slots(grid, by_id(SEM3))[101] & blocked


def test_impossible_requests_are_reported_not_hidden():
    # Teacher 101 is free only 2 periods a week but must teach 4.
    free = {(0, 0), (1, 0)}
    busy = {
        101: {
            (d, p): BusyReason("unavailable", "unavailable")
            for d in range(NUM_DAYS)
            for p in range(NUM_PERIODS)
            if (d, p) not in free
        }
    }
    result = generate(SEM3, busy, seed=1, time_limit=1.0)
    assert not result.complete
    assert [(u.subject_id, u.kind, u.count) for u in result.unplaced] == [(1, "theory", 2)]
    assert [i for i in validate(result.grid, by_id(SEM3), busy) if i.severity == "error"] == []


def test_too_many_hours_for_one_week():
    with pytest.raises(ValueError, match="periods per week"):
        generate([SubjectSpec(i, f"S{i}", None, 9, 0) for i in range(5)])


def test_validate_catches_clashes_and_bad_edits():
    subjects = by_id(SEM3)
    grid = generate(SEM3, seed=2).grid
    busy = {101: {}}

    # Put MAT203 where its teacher is taken by another class.
    slot = next(
        (d, p) for d in range(NUM_DAYS) for p in range(NUM_PERIODS) if grid[d][p] and grid[d][p]["subject_id"] == 1
    )
    busy[101][slot] = BusyReason("class", "Semester 5", 5)
    clash = [i for i in validate(grid, subjects, busy) if i.type == "teacher_clash"]
    assert len(clash) == 1 and clash[0].other_semester == 5

    broken = empty_grid()
    broken[0][3] = {"subject_id": 7, "kind": "lab"}  # lab of 1 period, crossing nothing
    broken[1][0] = {"subject_id": 999, "kind": "theory"}  # not a subject of this class
    broken[2][0] = {"subject_id": 1, "kind": "lab"}  # MAT203 has no lab
    types = {i.type for i in validate(broken, subjects)}
    assert {"invalid_lab_block", "unknown_subject", "not_a_lab", "hours_mismatch"} <= types


def test_lab_cannot_cross_lunch():
    grid = empty_grid()
    for period in (2, 3, 4):
        grid[0][period] = {"subject_id": 7, "kind": "lab"}
    assert "invalid_lab_block" in {i.type for i in validate(grid, by_id(SEM3))}


def test_random_curricula_never_produce_clashes():
    rng = random.Random(42)
    for _ in range(30):
        teachers = list(range(1, 9))
        subjects_a, subjects_b = [], []
        for idx in range(rng.randint(5, 8)):
            subjects_a.append(
                SubjectSpec(idx, f"A{idx}", rng.choice(teachers), rng.choice([2, 3, 4]), rng.choice([0, 0, 3]))
            )
        for idx in range(100, 100 + rng.randint(5, 8)):
            subjects_b.append(
                SubjectSpec(idx, f"B{idx}", rng.choice(teachers), rng.choice([2, 3, 4]), rng.choice([0, 0, 3]))
            )
        first = generate(subjects_a, seed=rng.randrange(1000))
        busy = busy_from(first.grid, subjects_a, 1)
        second = generate(subjects_b, busy, seed=rng.randrange(1000), time_limit=1.0)
        errors = [i for i in validate(second.grid, by_id(subjects_b), busy) if i.severity == "error"]
        assert errors == []
