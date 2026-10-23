import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Printer, RotateCcw, Save, Shuffle, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import TimetableGrid from "@/components/TimetableGrid.jsx";
import { Badge, EmptyState, NativeSelect } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { useTimetableConfig } from "@/hooks/useTimetableConfig.js";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api, errorMessage } from "@/lib/api.js";
import { SEMESTERS, todayIndex } from "@/lib/timetable.js";

/** Return a new grid with `value` placed at (day, period); labs fill a whole block. */
function applyEdit(grid, day, period, value, labBlock) {
    const next = grid.map((row) => [...row]);
    const row = next[day];

    const clearLabAt = (p) => {
        const cell = row[p];
        if (!cell || cell.kind !== "lab") return;
        const same = (c) => c && c.kind === "lab" && c.subject_id === cell.subject_id;
        let start = p;
        while (start > 0 && same(row[start - 1])) start--;
        let end = p;
        while (end < row.length - 1 && same(row[end + 1])) end++;
        for (let i = start; i <= end; i++) row[i] = null;
    };

    clearLabAt(period);
    row[period] = null;
    if (!value) return next;

    if (value.kind === "lab") {
        for (let p = period; p < Math.min(period + labBlock, row.length); p++) {
            clearLabAt(p);
            row[p] = { ...value };
        }
    } else {
        row[period] = { ...value };
    }
    return next;
}

function hoursSummary(grid, subjects) {
    return subjects.map((subject) => {
        let theory = 0;
        let lab = 0;
        for (const row of grid) {
            for (const cell of row) {
                if (cell?.subject_id !== subject.id) continue;
                if (cell.kind === "lab") lab++;
                else theory++;
            }
        }
        const theoryNeeded = subject.lecture_hours + subject.tutorial_hours;
        return { subject, theory, theoryNeeded, lab, labNeeded: subject.practical_hours, ok: theory === theoryNeeded && lab === subject.practical_hours };
    });
}

function IssueList({ issues }) {
    if (issues.length === 0) {
        return (
            <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> No clashes, and every subject has its hours.
            </p>
        );
    }
    return (
        <ul className="flex flex-col gap-1.5 text-sm">
            {issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                    {issue.severity === "error" ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span>{issue.message}</span>
                </li>
            ))}
        </ul>
    );
}

function ConflictsPanel({ conflicts, config, onSelect }) {
    if (conflicts.length === 0) return null;
    return (
        <Card className="border-destructive/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <XCircle className="h-5 w-5" /> {conflicts.length} clash{conflicts.length === 1 ? "" : "es"} in saved timetables
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
                <p className="mb-2 text-muted-foreground">
                    These appeared after the timetables were saved, for example because a subject got a new teacher. Open a semester and regenerate or edit it.
                </p>
                <ul className="flex flex-col gap-1">
                    {conflicts.map((c, i) => (
                        <li key={i}>
                            <span className="font-medium">{c.teacher.full_name}</span>,{" "}
                            {config.days[c.day]} P{c.period + 1}:{" "}
                            {c.type === "clash" ? "booked in " : "marked unavailable but booked in "}
                            {c.semesters.map((s, j) => (
                                <button key={s} type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => onSelect(s)}>
                                    {j > 0 ? ", " : ""}semester {s}
                                </button>
                            ))}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

export default function Timetable() {
    const { user, isManager } = useAuth();
    const config = useTimetableConfig();
    const [semester, setSemester] = useState(user.role === "student" ? user.semester : 3);
    const [data, setData] = useState(null);
    const [grid, setGrid] = useState(null);
    const [issues, setIssues] = useState([]);
    const [unplaced, setUnplaced] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState("");
    const [summaries, setSummaries] = useState([]);
    const [conflicts, setConflicts] = useState([]);
    const validationRun = useRef(0);

    const loadOverview = useCallback(async () => {
        try {
            const [list, clashes] = await Promise.all([
                api.get("/timetables"),
                isManager ? api.get("/timetables/conflicts") : Promise.resolve({ data: [] }),
            ]);
            setSummaries(list.data);
            setConflicts(clashes.data);
        } catch {
            // The overview is optional; the main timetable still loads.
        }
    }, [isManager]);

    const load = useCallback(async () => {
        setBusy("load");
        try {
            const response = await api.get(`/timetables/${semester}`);
            setData(response.data);
            setGrid(response.data.grid);
            setIssues(response.data.issues);
            setUnplaced([]);
            setDirty(false);
        } catch (error) {
            toast({ title: "Could not load the timetable", description: errorMessage(error), variant: "destructive" });
        } finally {
            setBusy("");
        }
    }, [semester]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    // Re-check the grid on the server whenever it is edited.
    useEffect(() => {
        if (!dirty || !isManager || !grid) return;
        const run = ++validationRun.current;
        const timer = setTimeout(async () => {
            try {
                const response = await api.post(`/timetables/${semester}/validate`, { grid });
                if (run === validationRun.current) setIssues(response.data);
            } catch {
                // Validation errors surface again on save.
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [grid, dirty, isManager, semester]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const changeSemester = (next) => {
        if (dirty && !window.confirm("Discard your unsaved changes to this timetable?")) return;
        setSemester(next);
    };

    const generate = async () => {
        setBusy("generate");
        try {
            const response = await api.post(`/timetables/${semester}/generate`, { seed: Math.floor(Math.random() * 2 ** 31) });
            setGrid(response.data.grid);
            setIssues(response.data.issues);
            setUnplaced(response.data.unplaced);
            setDirty(true);
            toast({
                title: response.data.unplaced.length ? "Partial timetable generated" : "Timetable generated",
                description: response.data.unplaced.length
                    ? "Some periods could not be placed without clashes. Review them below, then save."
                    : "No teacher clashes with other classes. Review it and save.",
            });
        } catch (error) {
            toast({ title: "Could not generate", description: errorMessage(error), variant: "destructive" });
        } finally {
            setBusy("");
        }
    };

    const save = async () => {
        setBusy("save");
        try {
            const response = await api.put(`/timetables/${semester}`, { grid });
            setData(response.data);
            setIssues(response.data.issues);
            setUnplaced([]);
            setDirty(false);
            toast({ title: "Timetable saved", description: `Semester ${semester} is now live for students and staff.` });
            loadOverview();
        } catch (error) {
            if (error.response?.status === 409) {
                setIssues(error.response.data.issues);
                toast({ title: "Not saved: clashes found", description: "Fix the periods marked in red first.", variant: "destructive" });
            } else {
                toast({ title: "Could not save", description: errorMessage(error), variant: "destructive" });
            }
        } finally {
            setBusy("");
        }
    };

    const remove = async () => {
        try {
            await api.delete(`/timetables/${semester}`);
            toast({ title: "Timetable deleted", description: `Semester ${semester} no longer has a saved timetable.` });
            await load();
            loadOverview();
        } catch (error) {
            toast({ title: "Could not delete", description: errorMessage(error), variant: "destructive" });
        }
    };

    const onCellChange = (day, period, value) => {
        setGrid((current) => applyEdit(current, day, period, value, config.lab_block));
        setDirty(true);
    };

    const subjects = useMemo(() => data?.subjects ?? [], [data]);
    const summary = useMemo(() => (grid ? hoursSummary(grid, subjects) : []), [grid, subjects]);
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const savedSemesters = new Map(summaries.map((s) => [s.semester, s]));

    return (
        <div className="flex flex-col gap-4">
            {isManager && <ConflictsPanel conflicts={conflicts} config={config} onSelect={changeSemester} />}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    {user.role === "student" ? (
                        <span className="font-semibold">Semester {semester}</span>
                    ) : (
                        <NativeSelect aria-label="Semester" className="w-44" value={semester} onChange={(e) => changeSemester(Number(e.target.value))}>
                            {SEMESTERS.map((s) => (
                                <option key={s} value={s}>
                                    Semester {s} {savedSemesters.has(s) ? "✓" : ""}
                                </option>
                            ))}
                        </NativeSelect>
                    )}
                    {data && (data.saved ? <Badge tone="success">Saved</Badge> : <Badge>Not saved yet</Badge>)}
                    {dirty && <Badge tone="warning">Unsaved changes</Badge>}
                    <span className="text-xs text-muted-foreground">
                        {semester % 2 ? "Odd" : "Even"} term: checked against semesters{" "}
                        {SEMESTERS.filter((s) => s % 2 === semester % 2 && s !== semester).join(", ")}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isManager && (
                        <>
                            <Button onClick={generate} disabled={Boolean(busy) || subjects.length === 0}>
                                {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                                {data?.saved || dirty ? "Regenerate" : "Generate"}
                            </Button>
                            <Button variant="secondary" onClick={save} disabled={!dirty || Boolean(busy) || errorCount > 0}>
                                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save
                            </Button>
                            {dirty && (
                                <Button variant="outline" onClick={load} disabled={Boolean(busy)}>
                                    <RotateCcw className="h-4 w-4" /> Discard
                                </Button>
                            )}
                            {data?.saved && !dirty && (
                                <ConfirmDialog
                                    title={`Delete the semester ${semester} timetable?`}
                                    description="Students and staff will no longer see it. Subjects are not affected."
                                    onConfirm={remove}
                                    trigger={
                                        <Button variant="outline" aria-label="Delete timetable">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    }
                                />
                            )}
                        </>
                    )}
                    <Button variant="outline" onClick={() => window.print()} aria-label="Print timetable">
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <h2 className="hidden text-xl font-bold print:block">Semester {semester} timetable</h2>

            {!data || !grid ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading timetable...
                </div>
            ) : subjects.length === 0 ? (
                <EmptyState title={`Semester ${semester} has no subjects yet`}>
                    {isManager ? "Add subjects on the Subjects page, then come back to generate the timetable." : "The timetable will appear here once it is ready."}
                </EmptyState>
            ) : !data.saved && !dirty && !isManager ? (
                <EmptyState title="The timetable has not been published yet" />
            ) : (
                <>
                    {isManager && !data.saved && !dirty && (
                        <p className="text-sm text-muted-foreground print:hidden">
                            Press <strong>Generate</strong> to build a timetable that avoids every teacher&apos;s classes in other semesters and their blocked periods. You can
                            then click any period to change it.
                        </p>
                    )}
                    <TimetableGrid
                        grid={grid}
                        subjects={subjects}
                        issues={issues}
                        config={config}
                        highlightDay={todayIndex(config)}
                        onCellChange={isManager ? onCellChange : undefined}
                    />

                    {unplaced.length > 0 && (
                        <Card className="border-amber-500/50 print:hidden">
                            <CardContent className="pt-4 text-sm">
                                <p className="font-medium">Some periods could not be placed without a clash:</p>
                                <ul className="mt-1 list-disc pl-5">
                                    {unplaced.map((u) => (
                                        <li key={`${u.subject_id}-${u.kind}`}>
                                            {u.code}: {u.count} {u.kind === "lab" ? "lab block(s)" : "theory period(s)"}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-muted-foreground">
                                    Usually the teacher is fully booked by other classes or blocked. Free up their availability, change the teacher, or place
                                    these by hand.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {(isManager || issues.length > 0) && (
                        <div className="grid gap-4 lg:grid-cols-2 print:hidden">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Checks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <IssueList issues={issues} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Hours per subject</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                                        {summary.map(({ subject, theory, theoryNeeded, lab, labNeeded, ok }) => (
                                            <li key={subject.id} className="flex items-center justify-between gap-2">
                                                <span className="truncate">
                                                    <span className="font-mono">{subject.code}</span> {subject.notation}
                                                </span>
                                                <Badge tone={ok ? "success" : "warning"}>
                                                    {theoryNeeded > 0 && `${theory}/${theoryNeeded}`}
                                                    {theoryNeeded > 0 && labNeeded > 0 && " · "}
                                                    {labNeeded > 0 && `lab ${lab}/${labNeeded}`}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
