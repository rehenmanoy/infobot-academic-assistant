import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import TimetableGrid from "@/components/TimetableGrid.jsx";
import { EmptyState } from "@/components/form.jsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.jsx";
import { useTeacherSchedule } from "@/hooks/useTeacherSchedule.js";
import { useTimetableConfig } from "@/hooks/useTimetableConfig.js";
import { useAuth } from "@/auth/AuthContext.jsx";
import { emptyGrid, subjectColor, todayIndex } from "@/lib/timetable.js";
import { cn } from "@/lib/utils.js";

export default function MySchedule() {
    const { user } = useAuth();
    const config = useTimetableConfig();
    const entries = useTeacherSchedule(user.id);
    const [term, setTerm] = useState(null);

    if (entries === null) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your schedule...
            </div>
        );
    }
    if (entries.length === 0) {
        return <EmptyState title="You have no classes in any saved timetable yet" />;
    }

    const hasOdd = entries.some((e) => e.semester % 2 === 1);
    const hasEven = entries.some((e) => e.semester % 2 === 0);
    const activeTerm = term ?? (hasOdd ? "odd" : "even");
    const shown = entries.filter((e) => (e.semester % 2 === 1) === (activeTerm === "odd"));

    const grid = emptyGrid(config);
    for (const entry of shown) grid[entry.day][entry.period] = entry;
    const totalPeriods = shown.length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {totalPeriods} teaching periods a week across {new Set(shown.map((e) => e.semester)).size} class(es).
                </p>
                {hasOdd && hasEven && (
                    <ToggleGroup type="single" value={activeTerm} onValueChange={(value) => value && setTerm(value)}>
                        <ToggleGroupItem value="odd">Odd term</ToggleGroupItem>
                        <ToggleGroupItem value="even">Even term</ToggleGroupItem>
                    </ToggleGroup>
                )}
            </div>
            <TimetableGrid
                grid={grid}
                config={config}
                highlightDay={todayIndex(config)}
                renderCell={(entry) =>
                    entry ? (
                        <div className={cn("flex min-h-14 flex-col justify-center rounded-md border px-1.5 py-1", subjectColor(entry.subject_id))} title={entry.name}>
                            <div className="flex items-center gap-1 font-semibold leading-tight">
                                {entry.kind === "lab" && <FlaskConical className="h-3 w-3 shrink-0" />}
                                <span className="truncate">{entry.code}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">Semester {entry.semester}</div>
                        </div>
                    ) : (
                        <div className="flex min-h-14 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Free</div>
                    )
                }
            />
        </div>
    );
}
