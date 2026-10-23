import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import UserFormDialog from "@/components/UserFormDialog.jsx";
import { Badge, EmptyState, NativeSelect } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { api, errorMessage } from "@/lib/api.js";
import { SEMESTERS } from "@/lib/timetable.js";

export default function ManageStudents() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [semester, setSemester] = useState("");
    const [query, setQuery] = useState("");

    const load = useCallback(async () => {
        try {
            const response = await api.get("/users", { params: { role: "student", semester: semester || undefined } });
            setStudents(response.data);
        } catch (error) {
            toast({ title: "Could not load students", description: errorMessage(error), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [semester]);

    useEffect(() => {
        load();
    }, [load]);

    const remove = async (student) => {
        try {
            await api.delete(`/users/${student.id}`);
            toast({ title: "Deleted", description: `${student.full_name} was removed.` });
            load();
        } catch (error) {
            toast({ title: "Could not delete", description: errorMessage(error), variant: "destructive" });
        }
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return students.filter((s) => !q || `${s.full_name} ${s.username} ${s.identifier ?? ""}`.toLowerCase().includes(q));
    }, [students, query]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search students..." className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <NativeSelect aria-label="Filter by semester" className="sm:w-44" value={semester} onChange={(e) => setSemester(e.target.value)}>
                        <option value="">All semesters</option>
                        {SEMESTERS.map((s) => (
                            <option key={s} value={s}>
                                Semester {s}
                            </option>
                        ))}
                    </NativeSelect>
                </div>
                <UserFormDialog
                    kind="student"
                    onSaved={load}
                    trigger={
                        <Button>
                            <Plus className="h-4 w-4" /> Add student
                        </Button>
                    }
                />
            </div>

            {!loading && visible.length === 0 ? (
                <EmptyState title={query || semester ? "No students match these filters" : "No students yet"} />
            ) : (
                <div className="rounded-lg border bg-background overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Register no.</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Semester</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground">
                                        Loading students...
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visible.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.full_name}</TableCell>
                                        <TableCell>{student.identifier ?? "—"}</TableCell>
                                        <TableCell>{student.username}</TableCell>
                                        <TableCell>{student.semester}</TableCell>
                                        <TableCell>
                                            {student.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <UserFormDialog
                                                    kind="student"
                                                    user={student}
                                                    onSaved={load}
                                                    trigger={
                                                        <Button variant="outline" size="icon" aria-label={`Edit ${student.full_name}`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <ConfirmDialog
                                                    title={`Delete ${student.full_name}?`}
                                                    description="This cannot be undone."
                                                    onConfirm={() => remove(student)}
                                                    trigger={
                                                        <Button variant="outline" size="icon" aria-label={`Delete ${student.full_name}`}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
