"""Timetable generation and validation.

This module is pure Python with no database access, so it can be unit-tested directly.

Terminology
-----------
* A *grid* is ``grid[day][period]`` where each cell is ``None`` or
  ``{"subject_id": int, "kind": "theory" | "lab"}``.
* A *slot* is a ``(day, period)`` tuple, both 0-indexed.
* *Busy* maps a teacher id to the slots where that teacher is already taken,
  either by another class's saved timetable or because they marked the slot unavailable.

Hard rules (never broken by the generator, reported as errors by the validator)
* A teacher is never in two places at once.
* A teacher is never scheduled in a slot they marked unavailable.
* A lab is one block of ``LAB_BLOCK`` consecutive periods inside a single session
  (it does not cross the lunch break).

Soft rules (the generator follows them, the validator reports them as warnings)
* Every subject gets exactly its weekly hours.
* Theory hours are spread across the week: at most ``ceil(hours / days)`` per day.
"""

from __future__ import annotations

import math
import random
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Literal

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
PERIODS = [
    ("08:50", "09:40"),
    ("09:40", "10:30"),
    ("10:50", "11:40"),
    ("11:40", "12:30"),
    ("13:30", "14:20"),
    ("14:20", "15:10"),
    ("15:20", "16:10"),
    ("16:10", "17:00"),
]
# Half-open period ranges that make up a teaching session (morning, afternoon).
SESSIONS = [(0, 4), (4, 8)]
LAB_BLOCK = 3

NUM_DAYS = len(DAYS)
NUM_PERIODS = len(PERIODS)

Kind = Literal["theory", "lab"]
Slot = tuple[int, int]
Grid = list[list[dict | None]]


def lab_start_periods() -> list[int]:
    return [start for first, end in SESSIONS for start in range(first, end - LAB_BLOCK + 1)]


def daily_theory_cap(hours: int) -> int:
    return max(1, math.ceil(hours / NUM_DAYS))


def empty_grid() -> Grid:
    return [[None for _ in range(NUM_PERIODS)] for _ in range(NUM_DAYS)]


def same_term(semester_a: int, semester_b: int) -> bool:
    """Odd semesters run in the same term, as do even ones; only those can clash."""
    return semester_a % 2 == semester_b % 2


@dataclass(frozen=True)
class SubjectSpec:
    id: int
    code: str
    teacher_id: int | None
    theory_hours: int
    practical_hours: int


@dataclass(frozen=True)
class BusyReason:
    kind: Literal["class", "unavailable"]
    label: str
    semester: int | None = None


Busy = dict[int, dict[Slot, BusyReason]]


@dataclass
class Issue:
    type: str
    severity: Literal["error", "warning"]
    message: str
    day: int | None = None
    period: int | None = None
    subject_id: int | None = None
    teacher_id: int | None = None
    other_semester: int | None = None


@dataclass
class Unplaced:
    subject_id: int
    kind: Kind
    count: int


@dataclass
class GenerateResult:
    grid: Grid
    unplaced: list[Unplaced] = field(default_factory=list)

    @property
    def complete(self) -> bool:
        return not self.unplaced


# --------------------------------------------------------------------------- generation


@dataclass
class _Group:
    """All identical sessions of one subject (e.g. its 3 theory hours)."""

    subject: SubjectSpec
    kind: Kind
    total: int
    placed: list[Slot] = field(default_factory=list)

    @property
    def remaining(self) -> int:
        return self.total - len(self.placed)

    @property
    def length(self) -> int:
        return LAB_BLOCK if self.kind == "lab" else 1


class _Search:
    def __init__(self, subjects: list[SubjectSpec], busy: Busy, rng: random.Random, relaxed: bool):
        self.busy = busy
        self.rng = rng
        self.relaxed = relaxed
        self.grid = empty_grid()
        self.teacher_used: dict[int, set[Slot]] = defaultdict(set)
        self.groups: list[_Group] = []
        for subject in subjects:
            if subject.practical_hours >= LAB_BLOCK:
                self.groups.append(_Group(subject, "lab", subject.practical_hours // LAB_BLOCK))
            if subject.theory_hours > 0:
                self.groups.append(_Group(subject, "theory", subject.theory_hours))

    # -- helpers

    def _teacher_free(self, teacher_id: int | None, slot: Slot) -> bool:
        if teacher_id is None:
            return True
        return slot not in self.busy.get(teacher_id, {}) and slot not in self.teacher_used[teacher_id]

    def _count_on_day(self, group: _Group, day: int) -> int:
        return sum(1 for d, _ in group.placed if d == day)

    def _cap(self, group: _Group) -> int:
        if group.kind == "lab":
            return 1
        cap = daily_theory_cap(group.total)
        return cap + 1 if self.relaxed else cap

    def _cells(self, group: _Group, slot: Slot) -> list[Slot]:
        day, period = slot
        return [(day, period + offset) for offset in range(group.length)]

    def candidates(self, group: _Group) -> list[Slot]:
        teacher = group.subject.teacher_id
        cap = self._cap(group)
        # Identical sessions are placed in increasing slot order, which removes
        # symmetric duplicates from the search without losing any solution.
        last = max(group.placed) if group.placed else (-1, -1)
        starts = lab_start_periods() if group.kind == "lab" else range(NUM_PERIODS)
        found: list[Slot] = []
        for day in range(NUM_DAYS):
            on_day = self._count_on_day(group, day)
            if on_day >= cap:
                continue
            for start in starts:
                slot = (day, start)
                if slot <= last:
                    continue
                cells = self._cells(group, slot)
                if all(self.grid[d][p] is None and self._teacher_free(teacher, (d, p)) for d, p in cells):
                    found.append(slot)
        if not self.relaxed and group.kind == "theory":
            found = [slot for slot in found if self._room_left_after(group, slot, cap)]
        return found

    def _room_left_after(self, group: _Group, slot: Slot, cap: int) -> bool:
        """Can the group's other sessions still fit on later days if we take ``slot``?"""
        still_needed = group.remaining - 1
        if still_needed == 0:
            return True
        day = slot[0]
        room_today = cap - self._count_on_day(group, day) - 1
        return room_today + cap * (NUM_DAYS - day - 1) >= still_needed

    def score(self, group: _Group, slot: Slot) -> float:
        day, period = slot
        teacher = group.subject.teacher_id
        teacher_today = sum(1 for d, _ in self.teacher_used.get(teacher, ()) if d == day) if teacher else 0
        class_today = sum(1 for cell in self.grid[day] if cell is not None)
        adjacent_same = any(
            0 <= p < NUM_PERIODS
            and self.grid[day][p] is not None
            and self.grid[day][p]["subject_id"] == group.subject.id
            for p in (period - 1, period + group.length)
        )
        return (
            self._count_on_day(group, day) * 10
            + teacher_today * 2
            + class_today * 0.5
            + (3 if adjacent_same else 0)
            + day * 0.2  # gently prefer earlier days so identical sessions spread forward
            + self.rng.random()
        )

    def place(self, group: _Group, slot: Slot) -> None:
        group.placed.append(slot)
        for day, period in self._cells(group, slot):
            self.grid[day][period] = {"subject_id": group.subject.id, "kind": group.kind}
            if group.subject.teacher_id is not None:
                self.teacher_used[group.subject.teacher_id].add((day, period))

    def unplace(self, group: _Group) -> None:
        slot = group.placed.pop()
        for day, period in self._cells(group, slot):
            self.grid[day][period] = None
            if group.subject.teacher_id is not None:
                self.teacher_used[group.subject.teacher_id].discard((day, period))

    # -- strategies

    def cap_to_isolated_capacity(self) -> list[Unplaced]:
        """Lower each group's demand to what fits given only its teacher's busy slots.

        Must be called before anything is placed. Returns what had to be dropped.
        """
        dropped: list[Unplaced] = []
        for group in self.groups:
            if group.kind == "lab":
                capacity = sum(1 for day in range(NUM_DAYS) if any(self.candidates_on(group, day)))
            else:
                cap = self._cap(group)
                capacity = sum(min(cap, len(self.candidates_on(group, day))) for day in range(NUM_DAYS))
            if capacity < group.total:
                dropped.append(Unplaced(subject_id=group.subject.id, kind=group.kind, count=group.total - capacity))
                group.total = capacity
        return dropped

    def candidates_on(self, group: _Group, day: int) -> list[int]:
        """Start periods on ``day`` that are free for the group's teacher and the class."""
        starts = lab_start_periods() if group.kind == "lab" else range(NUM_PERIODS)
        return [
            start
            for start in starts
            if all(
                self.grid[d][p] is None and self._teacher_free(group.subject.teacher_id, (d, p))
                for d, p in self._cells(group, (day, start))
            )
        ]

    def solve(self, max_nodes: int, deadline: float) -> bool:
        """Backtracking search choosing the most constrained group first."""
        nodes = 0

        def recurse() -> bool:
            nonlocal nodes
            open_groups = [g for g in self.groups if g.remaining > 0]
            if not open_groups:
                return True
            nodes += 1
            if nodes > max_nodes or time.monotonic() > deadline:
                raise TimeoutError
            best_group, best_options = None, None
            for group in open_groups:
                options = self.candidates(group)
                # Each remaining theory hour needs its own slot; a lab needs at least one start.
                needed = group.remaining if group.kind == "theory" else 1
                if len(options) < needed:
                    return False
                if best_options is None or len(options) < len(best_options):
                    best_group, best_options = group, options
            assert best_group is not None and best_options is not None
            best_options.sort(key=lambda s: self.score(best_group, s))
            for slot in best_options:
                self.place(best_group, slot)
                if recurse():
                    return True
                self.unplace(best_group)
            return False

        try:
            return recurse()
        except TimeoutError:
            return False

    def greedy(self) -> list[Unplaced]:
        """Place as much as possible without backtracking; report the rest."""
        unplaced: dict[tuple[int, str], int] = defaultdict(int)
        pending = [g for g in self.groups if g.remaining > 0]
        while pending:
            options_by_group = [(g, self.candidates(g)) for g in pending]
            group, options = min(options_by_group, key=lambda item: len(item[1]) or 10**6)
            if not options:
                for g, opts in options_by_group:
                    if not opts:
                        unplaced[(g.subject.id, g.kind)] += g.remaining
                        g.total = len(g.placed)
                pending = [g for g in pending if g.remaining > 0]
                continue
            options.sort(key=lambda s: self.score(group, s))
            self.place(group, options[0])
            pending = [g for g in pending if g.remaining > 0]
        return [Unplaced(subject_id=sid, kind=kind, count=count) for (sid, kind), count in unplaced.items()]


def _validate_capacity(subjects: list[SubjectSpec]) -> None:
    lab_cells = sum((s.practical_hours // LAB_BLOCK) * LAB_BLOCK for s in subjects)
    theory_cells = sum(s.theory_hours for s in subjects)
    if lab_cells + theory_cells > NUM_DAYS * NUM_PERIODS:
        raise ValueError(
            f"Subjects need {lab_cells + theory_cells} periods per week but only "
            f"{NUM_DAYS * NUM_PERIODS} exist. Reduce the subject hours."
        )


def generate(
    subjects: list[SubjectSpec],
    busy: Busy | None = None,
    seed: int | None = None,
    max_nodes: int = 20_000,
    time_limit: float = 5.0,
) -> GenerateResult:
    """Build a timetable for one class that never clashes with ``busy`` teachers."""
    _validate_capacity(subjects)
    busy = busy or {}
    rng_seed = seed if seed is not None else random.randrange(1 << 30)

    deadline = time.monotonic() + time_limit
    search = _Search(subjects, busy, random.Random(rng_seed), relaxed=False)
    if search.solve(max_nodes=max_nodes, deadline=deadline):
        return GenerateResult(grid=search.grid)

    # Some subjects may be impossible on their own (e.g. a teacher with too few free periods).
    # Ask only for what each subject can get, place that perfectly, and report the shortfall.
    capped = _Search(subjects, busy, random.Random(rng_seed), relaxed=False)
    shortfall = capped.cap_to_isolated_capacity()
    if shortfall and capped.solve(max_nodes=max_nodes, deadline=deadline + time_limit):
        return GenerateResult(grid=capped.grid, unplaced=shortfall)

    # Still stuck: relax the per-day spread and fill what we can without backtracking.
    fallback = _Search(subjects, busy, random.Random(rng_seed), relaxed=True)
    unplaced = fallback.greedy()
    return GenerateResult(grid=fallback.grid, unplaced=unplaced)


# --------------------------------------------------------------------------- validation


def _slot_label(day: int, period: int) -> str:
    return f"{DAYS[day]} period {period + 1}"


def validate(
    grid: Grid,
    subjects: dict[int, SubjectSpec],
    busy: Busy | None = None,
) -> list[Issue]:
    """Check a (possibly hand-edited) grid for one class. ``subjects`` are that class's subjects."""
    busy = busy or {}
    issues: list[Issue] = []
    theory_count: dict[int, int] = defaultdict(int)
    lab_count: dict[int, int] = defaultdict(int)
    theory_per_day: dict[tuple[int, int], int] = defaultdict(int)
    valid_lab_starts = set(lab_start_periods())

    for day in range(NUM_DAYS):
        period = 0
        while period < NUM_PERIODS:
            cell = grid[day][period]
            if cell is None:
                period += 1
                continue
            subject = subjects.get(cell["subject_id"])
            if subject is None:
                issues.append(
                    Issue(
                        "unknown_subject",
                        "error",
                        f"{_slot_label(day, period)} has a subject that is not part of this semester",
                        day,
                        period,
                        cell["subject_id"],
                    )
                )
                period += 1
                continue

            if cell["kind"] == "lab":
                run = 0
                while (
                    period + run < NUM_PERIODS
                    and (other := grid[day][period + run]) is not None
                    and other["kind"] == "lab"
                    and other["subject_id"] == subject.id
                ):
                    run += 1
                if subject.practical_hours == 0:
                    issues.append(
                        Issue(
                            "not_a_lab",
                            "error",
                            f"{subject.code} has no practical hours but is scheduled as a lab on {DAYS[day]}",
                            day,
                            period,
                            subject.id,
                        )
                    )
                elif run != LAB_BLOCK or period not in valid_lab_starts:
                    issues.append(
                        Issue(
                            "invalid_lab_block",
                            "error",
                            f"{subject.code} lab on {DAYS[day]} must be {LAB_BLOCK} consecutive periods inside one session",
                            day,
                            period,
                            subject.id,
                        )
                    )
                lab_count[subject.id] += run
                cells = [(day, period + offset) for offset in range(run)]
                period += run
            else:
                if subject.theory_hours == 0:
                    issues.append(
                        Issue(
                            "not_theory",
                            "error",
                            f"{subject.code} has no theory hours but is scheduled as theory on {DAYS[day]}",
                            day,
                            period,
                            subject.id,
                        )
                    )
                theory_count[subject.id] += 1
                theory_per_day[(subject.id, day)] += 1
                cells = [(day, period)]
                period += 1

            if subject.teacher_id is None:
                continue
            for slot in cells:
                reason = busy.get(subject.teacher_id, {}).get(slot)
                if reason is None:
                    continue
                if reason.kind == "class":
                    issues.append(
                        Issue(
                            "teacher_clash",
                            "error",
                            f"{subject.code}: the teacher already teaches {reason.label} on {_slot_label(*slot)}",
                            slot[0],
                            slot[1],
                            subject.id,
                            subject.teacher_id,
                            reason.semester,
                        )
                    )
                else:
                    issues.append(
                        Issue(
                            "teacher_unavailable",
                            "error",
                            f"{subject.code}: the teacher is unavailable on {_slot_label(*slot)}",
                            slot[0],
                            slot[1],
                            subject.id,
                            subject.teacher_id,
                        )
                    )

    for subject in subjects.values():
        if theory_count[subject.id] != subject.theory_hours:
            issues.append(
                Issue(
                    "hours_mismatch",
                    "warning",
                    f"{subject.code} has {theory_count[subject.id]} of {subject.theory_hours} theory hours",
                    subject_id=subject.id,
                )
            )
        expected_lab = (subject.practical_hours // LAB_BLOCK) * LAB_BLOCK
        if lab_count[subject.id] != expected_lab:
            issues.append(
                Issue(
                    "hours_mismatch",
                    "warning",
                    f"{subject.code} has {lab_count[subject.id]} of {expected_lab} lab hours",
                    subject_id=subject.id,
                )
            )
        if subject.teacher_id is None and (theory_count[subject.id] or lab_count[subject.id]):
            issues.append(
                Issue(
                    "no_teacher",
                    "warning",
                    f"{subject.code} has no teacher assigned, so clashes cannot be checked",
                    subject_id=subject.id,
                )
            )
        for day in range(NUM_DAYS):
            if theory_per_day[(subject.id, day)] > daily_theory_cap(subject.theory_hours) + 1:
                issues.append(
                    Issue(
                        "overloaded_day",
                        "warning",
                        f"{subject.code} has {theory_per_day[(subject.id, day)]} theory periods on {DAYS[day]}",
                        day=day,
                        subject_id=subject.id,
                    )
                )

    return issues


def teacher_slots(grid: Grid, subjects: dict[int, SubjectSpec]) -> dict[int, set[Slot]]:
    """Which slots each teacher occupies in one saved grid."""
    used: dict[int, set[Slot]] = defaultdict(set)
    for day, row in enumerate(grid):
        for period, cell in enumerate(row):
            if cell is None:
                continue
            subject = subjects.get(cell["subject_id"])
            if subject is not None and subject.teacher_id is not None:
                used[subject.teacher_id].add((day, period))
    return used
