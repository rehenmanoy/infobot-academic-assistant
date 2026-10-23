import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import { Badge, EmptyState, Field, FormError, NativeSelect } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api, downloadFile, errorMessage } from "@/lib/api.js";
import { SEMESTERS, SUBJECT_TYPES } from "@/lib/timetable.js";

const TYPE_LABELS = Object.fromEntries(SUBJECT_TYPES.map((t) => [t.value, t.label]));

function initialSubject(subject) {
    return {
        code: subject?.code ?? "",
        name: subject?.name ?? "",
        notation: subject?.notation ?? "",
        type: subject?.type ?? "core",
        teacher_id: subject?.teacher?.id ?? "",
        lecture_hours: subject?.lecture_hours ?? 3,
        tutorial_hours: subject?.tutorial_hours ?? 0,
        practical_hours: subject?.practical_hours ?? 0,
        credits: subject?.credits ?? 3,
    };
}

function SubjectFormDialog({ semester, subject, teachers, trigger, onSaved }) {
    const editing = Boolean(subject);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(() => initialSubject(subject));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (field, numeric = false) => (event) =>
        setForm((current) => ({ ...current, [field]: numeric ? Number(event.target.value) : event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        const body = { ...form, teacher_id: form.teacher_id === "" ? null : Number(form.teacher_id) };
        setSaving(true);
        try {
            const response = editing
                ? await api.patch(`/subjects/${subject.id}`, body)
                : await api.post("/subjects", { ...body, semester });
            toast({ title: editing ? "Subject updated" : "Subject added", description: `${response.data.code} ${response.data.name}` });
            setOpen(false);
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    setForm(initialSubject(subject));
                    setError("");
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${subject.code}` : `Add a subject to semester ${semester}`}</DialogTitle>
                        <DialogDescription>Weekly hours decide how many periods the timetable gives this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Code" htmlFor="code">
                            <Input id="code" value={form.code} onChange={set("code")} required maxLength={20} placeholder="ITT201" />
                        </Field>
                        <Field label="Short name" htmlFor="notation" hint="Shown in timetable cells">
                            <Input id="notation" value={form.notation} onChange={set("notation")} maxLength={20} placeholder="DS" />
                        </Field>
                        <Field label="Name" htmlFor="name" className="sm:col-span-2">
                            <Input id="name" value={form.name} onChange={set("name")} required maxLength={200} placeholder="Data Structures" />
                        </Field>
                        <Field label="Type" htmlFor="type">
                            <NativeSelect id="type" value={form.type} onChange={set("type")}>
                                {SUBJECT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                        <Field label="Teacher" htmlFor="teacher">
                            <NativeSelect id="teacher" value={form.teacher_id} onChange={set("teacher_id")}>
                                <option value="">Not assigned</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.full_name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                        <Field label="Lecture hours / week" htmlFor="lecture">
                            <Input id="lecture" type="number" min={0} max={10} value={form.lecture_hours} onChange={set("lecture_hours", true)} />
                        </Field>
                        <Field label="Tutorial hours / week" htmlFor="tutorial">
                            <Input id="tutorial" type="number" min={0} max={10} value={form.tutorial_hours} onChange={set("tutorial_hours", true)} />
                        </Field>
                        <Field label="Practical hours / week" htmlFor="practical" hint="Labs run in 3-period blocks">
                            <Input
                                id="practical"
                                type="number"
                                min={0}
                                max={12}
                                step={3}
                                value={form.practical_hours}
                                onChange={set("practical_hours", true)}
                            />
                        </Field>
                        <Field label="Credits" htmlFor="credits">
                            <Input id="credits" type="number" min={0} max={10} value={form.credits} onChange={set("credits", true)} />
                        </Field>
                    </div>
                    <FormError message={error} />
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : editing ? "Save changes" : "Add subject"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SyllabusUpload({ subject, onUploaded }) {
    const input = useRef(null);
    const [busy, setBusy] = useState(false);

    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (file.type !== "application/pdf") {
            toast({ title: "Only PDF files", description: "Choose the syllabus as a PDF.", variant: "destructive" });
            return;
        }
        const body = new FormData();
        body.append("file", file);
        setBusy(true);
        try {
            await api.put(`/subjects/${subject.id}/syllabus`, body);
            toast({ title: "Syllabus uploaded", description: file.name });
            onUploaded();
        } catch (error) {
            toast({ title: "Upload failed", description: errorMessage(error), variant: "destructive" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={upload} />
            <Button variant="outline" size="icon" disabled={busy} onClick={() => input.current?.click()} aria-label={`Upload syllabus for ${subject.code}`}>
                <Upload className="h-4 w-4" />
            </Button>
        </>
    );
}

export default function ManageSubjects() {
    const { user, isManager } = useAuth();
    const [semester, setSemester] = useState(user.role === "student" ? user.semester : 3);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const response = await api.get("/subjects", { params: { semester } });
            setSubjects(response.data);
        } catch (error) {
            toast({ title: "Could not load subjects", description: errorMessage(error), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [semester]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!isManager) return;
        api.get("/users", { params: { role: ["hod", "teacher"] }, paramsSerializer: { indexes: null } })
            .then((response) => setTeachers(response.data.filter((t) => t.is_active)))
            .catch(() => setTeachers([]));
    }, [isManager]);

    const remove = async (subject) => {
        try {
            await api.delete(`/subjects/${subject.id}`);
            toast({ title: "Subject deleted", description: `${subject.code} was removed from the timetable too.` });
            load();
        } catch (error) {
            toast({ title: "Could not delete", description: errorMessage(error), variant: "destructive" });
        }
    };

    const download = async (subject) => {
        try {
            await downloadFile(`/subjects/${subject.id}/syllabus`, subject.syllabus_name || `${subject.code}.pdf`);
        } catch (error) {
            toast({ title: "Download failed", description: errorMessage(error), variant: "destructive" });
        }
    };

    const weeklyPeriods = subjects.reduce((sum, s) => sum + s.lecture_hours + s.tutorial_hours + s.practical_hours, 0);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <NativeSelect
                        aria-label="Semester"
                        className="w-44"
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                    >
                        {SEMESTERS.map((s) => (
                            <option key={s} value={s}>
                                Semester {s}
                            </option>
                        ))}
                    </NativeSelect>
                    <span className="text-sm text-muted-foreground">{weeklyPeriods} of 40 weekly periods used</span>
                </div>
                {isManager && (
                    <SubjectFormDialog
                        semester={semester}
                        teachers={teachers}
                        onSaved={load}
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4" /> Add subject
                            </Button>
                        }
                    />
                )}
            </div>

            {!loading && subjects.length === 0 ? (
                <EmptyState title={`No subjects in semester ${semester} yet`}>
                    {isManager ? "Add the subjects with their weekly hours, then generate the timetable." : "Check back later."}
                </EmptyState>
            ) : (
                <div className="rounded-lg border bg-background overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Teacher</TableHead>
                                <TableHead title="Lecture - Tutorial - Practical hours per week">L-T-P</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead className="text-right">Syllabus & actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects.map((subject) => (
                                <TableRow key={subject.id}>
                                    <TableCell className="font-mono text-sm">{subject.code}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{subject.name}</div>
                                        {subject.notation && <div className="text-xs text-muted-foreground">{subject.notation}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge tone={subject.type === "lab" ? "primary" : "default"}>{TYPE_LABELS[subject.type]}</Badge>
                                    </TableCell>
                                    <TableCell>{subject.teacher?.full_name ?? <Badge tone="warning">Unassigned</Badge>}</TableCell>
                                    <TableCell>{`${subject.lecture_hours}-${subject.tutorial_hours}-${subject.practical_hours}`}</TableCell>
                                    <TableCell>{subject.credits}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            {subject.syllabus_name && (
                                                <Button variant="outline" size="icon" onClick={() => download(subject)} aria-label={`Download syllabus for ${subject.code}`}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {isManager && (
                                                <>
                                                    <SyllabusUpload subject={subject} onUploaded={load} />
                                                    <SubjectFormDialog
                                                        semester={semester}
                                                        subject={subject}
                                                        teachers={teachers}
                                                        onSaved={load}
                                                        trigger={
                                                            <Button variant="outline" size="icon" aria-label={`Edit ${subject.code}`}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <ConfirmDialog
                                                        title={`Delete ${subject.code}?`}
                                                        description="It will also be removed from this semester's saved timetable."
                                                        onConfirm={() => remove(subject)}
                                                        trigger={
                                                            <Button variant="outline" size="icon" aria-label={`Delete ${subject.code}`}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        }
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
