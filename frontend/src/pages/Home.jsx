import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarCheck, CalendarDays, GraduationCap, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge, EmptyState } from "@/components/form.jsx";
import { useTimetableConfig } from "@/hooks/useTimetableConfig.js";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api } from "@/lib/api.js";
import { ROLE_LABELS } from "@/lib/navigation.js";
import { todayIndex } from "@/lib/timetable.js";
import { useTeacherSchedule } from "@/hooks/useTeacherSchedule.js";

function Stat({ icon: Icon, label, value, to, tone }) {
    return (
        <Link to={to} className="block">
            <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 pt-6">
                    <div className={`rounded-lg p-2.5 ${tone === "danger" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{value ?? "–"}</p>
                        <p className="text-sm text-muted-foreground">{label}</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function ManagerOverview() {
    const [stats, setStats] = useState({});

    useEffect(() => {
        Promise.allSettled([
            api.get("/users", { params: { role: ["hod", "teacher"] }, paramsSerializer: { indexes: null } }),
            api.get("/users", { params: { role: "student" } }),
            api.get("/subjects"),
            api.get("/timetables"),
            api.get("/timetables/conflicts"),
        ]).then(([staff, students, subjects, timetables, conflicts]) => {
            const value = (result) => (result.status === "fulfilled" ? result.value.data : null);
            setStats({
                staff: value(staff)?.length,
                students: value(students)?.length,
                subjects: value(subjects)?.length,
                timetables: value(timetables),
                conflicts: value(conflicts)?.length,
            });
        });
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat icon={Users} label="Staff" value={stats.staff} to="/manage_teachers" />
                <Stat icon={GraduationCap} label="Students" value={stats.students} to="/manage_students" />
                <Stat icon={BookOpen} label="Subjects" value={stats.subjects} to="/manage_subjects" />
                <Stat icon={CalendarCheck} label="Saved timetables" value={stats.timetables?.length} to="/time_table" />
                <Stat
                    icon={AlertTriangle}
                    label="Teacher clashes"
                    value={stats.conflicts}
                    to="/time_table"
                    tone={stats.conflicts ? "danger" : undefined}
                />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Timetables</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.timetables?.length ? (
                        <ul className="divide-y text-sm">
                            {stats.timetables.map((t) => (
                                <li key={t.semester} className="flex items-center justify-between py-2">
                                    <span>Semester {t.semester}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{t.filled_periods} periods</span>
                                        {t.errors ? <Badge tone="danger">{t.errors} clashes</Badge> : <Badge tone="success">No clashes</Badge>}
                                        {t.warnings > 0 && <Badge tone="warning">{t.warnings} warnings</Badge>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="No timetables saved yet">
                            <Button asChild className="mt-2">
                                <Link to="/time_table">Build the first one</Link>
                            </Button>
                        </EmptyState>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function TodayList({ items }) {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">No classes today.</p>;
    return (
        <ul className="divide-y text-sm">
            {items.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="w-28 shrink-0 text-muted-foreground">{item.time}</span>
                    <span className="flex-1 truncate font-medium">{item.title}</span>
                    <span className="truncate text-muted-foreground">{item.detail}</span>
                </li>
            ))}
        </ul>
    );
}

function TeacherToday() {
    const { user } = useAuth();
    const config = useTimetableConfig();
    const entries = useTeacherSchedule(user.id);
    const day = todayIndex(config);
    const today = (entries ?? [])
        .filter((e) => e.day === day)
        .sort((a, b) => a.period - b.period)
        .map((e) => ({
            key: `${e.semester}-${e.period}`,
            time: `${config.periods[e.period].start}–${config.periods[e.period].end}`,
            title: `${e.code} ${e.name}${e.kind === "lab" ? " (lab)" : ""}`,
            detail: `Semester ${e.semester}`,
        }));
    return <TodayList items={today} />;
}

function StudentToday() {
    const { user } = useAuth();
    const config = useTimetableConfig();
    const [timetable, setTimetable] = useState(null);
    useEffect(() => {
        api.get(`/timetables/${user.semester}`).then((r) => setTimetable(r.data)).catch(() => setTimetable(null));
    }, [user.semester]);

    const day = todayIndex(config);
    if (!timetable?.saved) return <p className="text-sm text-muted-foreground">Your timetable has not been published yet.</p>;
    const subjects = Object.fromEntries(timetable.subjects.map((s) => [s.id, s]));
    const today = (day >= 0 ? timetable.grid[day] : [])
        .map((cell, period) => ({ cell, period }))
        .filter(({ cell }) => cell)
        .map(({ cell, period }) => ({
            key: period,
            time: `${config.periods[period].start}–${config.periods[period].end}`,
            title: `${subjects[cell.subject_id]?.name ?? "Unknown"}${cell.kind === "lab" ? " (lab)" : ""}`,
            detail: subjects[cell.subject_id]?.teacher?.full_name ?? "",
        }));
    return <TodayList items={today} />;
}

export default function Home() {
    const { user, isManager } = useAuth();
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-2xl font-bold">Welcome, {user.first_name}</h2>
                <p className="text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                    {user.role === "student" && ` · Semester ${user.semester}`} · {weekday}
                </p>
            </div>

            {isManager && <ManagerOverview />}

            {user.role !== "admin" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarDays className="h-4 w-4" /> Today
                        </CardTitle>
                        <Button asChild variant="outline" size="sm">
                            <Link to={user.role === "student" ? "/time_table" : "/my_schedule"}>Full week</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>{user.role === "student" ? <StudentToday /> : <TeacherToday />}</CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <p className="text-sm">Ask InfoBot about your timetable, subjects or study plans.</p>
                    </div>
                    <Button asChild size="sm">
                        <Link to="/chat_with_me">Open chat</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
