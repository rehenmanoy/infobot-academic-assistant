// Mirrors the backend defaults; pages fetch /api/timetables/config for the real values.
export const DEFAULT_CONFIG = {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    periods: [
        { number: 1, start: "08:50", end: "09:40" },
        { number: 2, start: "09:40", end: "10:30" },
        { number: 3, start: "10:50", end: "11:40" },
        { number: 4, start: "11:40", end: "12:30" },
        { number: 5, start: "13:30", end: "14:20" },
        { number: 6, start: "14:20", end: "15:10" },
        { number: 7, start: "15:20", end: "16:10" },
        { number: 8, start: "16:10", end: "17:00" },
    ],
    sessions: [
        [0, 4],
        [4, 8],
    ],
    lab_block: 3,
    lab_start_periods: [0, 1, 4, 5],
};

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const SHORT_DAYS = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri" };

export function emptyGrid(config = DEFAULT_CONFIG) {
    return config.days.map(() => config.periods.map(() => null));
}

/** Today's weekday as an index into config.days, or -1 at the weekend. */
export function todayIndex(config = DEFAULT_CONFIG) {
    const name = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return config.days.indexOf(name);
}

export const SUBJECT_TYPES = [
    { value: "core", label: "Core" },
    { value: "elective", label: "Elective" },
    { value: "lab", label: "Lab" },
    { value: "non_credit", label: "Non-credit" },
    { value: "minor", label: "Minor" },
];

// A stable color per subject so the same subject is easy to follow across the week.
const PALETTE = [
    "bg-sky-100 border-sky-300 dark:bg-sky-950 dark:border-sky-800",
    "bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800",
    "bg-amber-100 border-amber-300 dark:bg-amber-950 dark:border-amber-800",
    "bg-violet-100 border-violet-300 dark:bg-violet-950 dark:border-violet-800",
    "bg-rose-100 border-rose-300 dark:bg-rose-950 dark:border-rose-800",
    "bg-teal-100 border-teal-300 dark:bg-teal-950 dark:border-teal-800",
    "bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800",
    "bg-indigo-100 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-800",
    "bg-lime-100 border-lime-300 dark:bg-lime-950 dark:border-lime-800",
    "bg-fuchsia-100 border-fuchsia-300 dark:bg-fuchsia-950 dark:border-fuchsia-800",
];

export function subjectColor(subjectId) {
    return PALETTE[Math.abs(subjectId) % PALETTE.length];
}
