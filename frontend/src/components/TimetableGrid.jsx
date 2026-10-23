import { Fragment, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { cn } from "@/lib/utils.js";
import { DEFAULT_CONFIG, SHORT_DAYS, subjectColor } from "@/lib/timetable.js";


function CellEditor({ subjects, cell, onPick, children }) {
    const [open, setOpen] = useState(false);
    const pick = (value) => {
        onPick(value);
        setOpen(false);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-64 p-1 max-h-80 overflow-y-auto">
                {subjects.map((subject) => (
                    <Fragment key={subject.id}>
                        {subject.lecture_hours + subject.tutorial_hours > 0 && (
                            <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => pick({ subject_id: subject.id, kind: "theory" })}
                            >
                                <span className="font-mono">{subject.code}</span> {subject.notation || subject.name}
                            </button>
                        )}
                        {subject.practical_hours > 0 && (
                            <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => pick({ subject_id: subject.id, kind: "lab" })}
                            >
                                <span className="font-mono">{subject.code}</span> lab block
                            </button>
                        )}
                    </Fragment>
                ))}
                {cell && (
                    <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => pick(null)}
                    >
                        Clear this period
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
}

/**
 * Weekly grid.
 * - `grid[day][period]` is null or {subject_id, kind}
 * - `subjects` gives code/name/teacher for each subject id
 * - `issues` with day/period are highlighted
 * - pass `onCellChange(day, period, value)` to make cells editable
 * - pass `renderCell(cell, day, period)` to customize cell content (e.g. a teacher's schedule)
 */
export default function TimetableGrid({ grid, subjects = [], issues = [], config = DEFAULT_CONFIG, onCellChange, renderCell, highlightDay = -1 }) {
    const byId = Object.fromEntries(subjects.map((s) => [s.id, s]));
    const errorCells = new Map();
    for (const issue of issues) {
        if (issue.severity === "error" && issue.day != null && issue.period != null) {
            errorCells.set(`${issue.day}:${issue.period}`, issue.message);
        }
    }
    const sessionStarts = new Set(config.sessions.slice(1).map(([start]) => start));

    return (
        <div className="overflow-x-auto rounded-lg border bg-background print:overflow-visible">
            <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                    <tr className="bg-muted/60">
                        <th className="w-20 p-2 text-left font-semibold">Day</th>
                        {config.periods.map((period, index) => (
                            <th
                                key={period.number}
                                className={cn("p-2 text-center font-semibold", sessionStarts.has(index) && "border-l-4 border-l-muted")}
                            >
                                <div>P{period.number}</div>
                                <div className="text-[11px] font-normal text-muted-foreground">
                                    {period.start}–{period.end}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {config.days.map((day, dayIndex) => (
                        <tr key={day} className={cn("border-t", dayIndex === highlightDay && "bg-primary/5")}>
                            <th scope="row" className="p-2 text-left font-semibold">
                                {SHORT_DAYS[day] ?? day}
                            </th>
                            {config.periods.map((period, periodIndex) => {
                                const cell = grid?.[dayIndex]?.[periodIndex] ?? null;
                                const subject = cell ? byId[cell.subject_id] : null;
                                const error = errorCells.get(`${dayIndex}:${periodIndex}`);
                                const content = renderCell ? (
                                    renderCell(cell, dayIndex, periodIndex)
                                ) : cell ? (
                                    <div
                                        className={cn(
                                            "flex h-full min-h-14 flex-col justify-center rounded-md border px-1.5 py-1 text-left",
                                            subjectColor(cell.subject_id),
                                        )}
                                    >
                                        <div className="flex items-center gap-1 font-semibold leading-tight">
                                            {cell.kind === "lab" && <FlaskConical className="h-3 w-3 shrink-0" aria-label="Lab" />}
                                            <span className="truncate">{subject?.notation || subject?.code || "Unknown"}</span>
                                        </div>
                                        <div className="truncate text-[11px] text-muted-foreground">{subject?.teacher?.full_name ?? "No teacher"}</div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-14 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                                        {onCellChange ? "+" : "Free"}
                                    </div>
                                );

                                const wrapped = (
                                    <div
                                        className={cn("relative", error && "rounded-md ring-2 ring-destructive")}
                                        title={error ?? (subject ? `${subject.code} ${subject.name}` : undefined)}
                                    >
                                        {content}
                                        {error && (
                                            <span className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                                                <X className="h-2.5 w-2.5" />
                                            </span>
                                        )}
                                    </div>
                                );

                                return (
                                    <td
                                        key={period.number}
                                        className={cn("p-1 align-top", sessionStarts.has(periodIndex) && "border-l-4 border-l-muted")}
                                    >
                                        {onCellChange ? (
                                            <CellEditor subjects={subjects} cell={cell} onPick={(value) => onCellChange(dayIndex, periodIndex, value)}>
                                                <button
                                                    type="button"
                                                    className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    aria-label={`${day} period ${period.number}: ${subject ? subject.code : "free"}. Click to change.`}
                                                >
                                                    {wrapped}
                                                </button>
                                            </CellEditor>
                                        ) : (
                                            wrapped
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
