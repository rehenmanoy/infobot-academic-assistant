import { useState } from "react";
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
import { Switch } from "@/components/ui/switch.jsx";
import AvailabilityGrid from "@/components/AvailabilityGrid.jsx";
import { Field, FormError, NativeSelect } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api, errorMessage } from "@/lib/api.js";
import { SEMESTERS } from "@/lib/timetable.js";

const MAX_PHOTO_BYTES = 512 * 1024;

function initialState(kind, user) {
    return {
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
        username: user?.username ?? "",
        identifier: user?.identifier ?? "",
        password: "",
        confirmPassword: "",
        role: user?.role ?? (kind === "student" ? "student" : "teacher"),
        teacher_type: user?.teacher_type ?? "departmental",
        semester: user?.semester ?? 1,
        is_active: user?.is_active ?? true,
        photo: user?.photo ?? null,
        unavailable_slots: user?.unavailable_slots ?? [],
    };
}

/**
 * Create or edit a staff member (kind="staff") or a student (kind="student").
 * Pass `user` to edit; omit it to create.
 */
export default function UserFormDialog({ kind, user, trigger, onSaved, config }) {
    const { user: actor } = useAuth();
    const editing = Boolean(user);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(() => initialState(kind, user));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (field) => (event) => {
        const value = event?.target ? (event.target.type === "number" ? Number(event.target.value) : event.target.value) : event;
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleOpenChange = (next) => {
        setOpen(next);
        if (next) {
            setForm(initialState(kind, user));
            setError("");
        }
    };

    const choosePhoto = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setError("Photo must be a PNG, JPEG or WebP image.");
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError("Photo must be 512 KB or smaller.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setForm((current) => ({ ...current, photo: reader.result }));
        reader.readAsDataURL(file);
    };

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        if (!editing && !form.password) return setError("Set an initial password.");
        if (form.password !== form.confirmPassword) return setError("The passwords do not match.");

        const body = {
            first_name: form.first_name,
            last_name: form.last_name,
            username: form.username,
            identifier: form.identifier || null,
            role: form.role,
            is_active: form.is_active,
        };
        if (form.password) body.password = form.password;
        if (kind === "student") {
            body.semester = Number(form.semester);
        } else {
            body.teacher_type = form.teacher_type;
            body.unavailable_slots = form.unavailable_slots;
            body.photo = form.photo;
        }

        setSaving(true);
        try {
            const response = editing ? await api.patch(`/users/${user.id}`, body) : await api.post("/users", body);
            toast({ title: editing ? "Saved" : "Created", description: `${response.data.full_name} has been ${editing ? "updated" : "added"}.` });
            setOpen(false);
            onSaved?.(response.data);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const isSelf = editing && actor?.id === user.id;
    const label = kind === "student" ? "student" : "staff member";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${user.full_name}` : `Add a ${label}`}</DialogTitle>
                        <DialogDescription>
                            {editing ? "Leave the password empty to keep the current one." : "They will sign in with this username and password."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" htmlFor="first_name">
                            <Input id="first_name" value={form.first_name} onChange={set("first_name")} required maxLength={100} />
                        </Field>
                        <Field label="Last name" htmlFor="last_name">
                            <Input id="last_name" value={form.last_name} onChange={set("last_name")} required maxLength={100} />
                        </Field>
                        <Field label="Username" htmlFor="username" hint="Letters, numbers and . _ - @">
                            <Input
                                id="username"
                                value={form.username}
                                onChange={set("username")}
                                required
                                minLength={3}
                                maxLength={64}
                                pattern="[A-Za-z0-9_.@\-]+"
                                autoComplete="off"
                            />
                        </Field>
                        <Field label={kind === "student" ? "Register number" : "Employee ID"} htmlFor="identifier">
                            <Input id="identifier" value={form.identifier} onChange={set("identifier")} maxLength={50} />
                        </Field>
                        <Field label={editing ? "New password" : "Password"} htmlFor="password" hint="At least 8 characters, not only letters or digits">
                            <Input id="password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
                        </Field>
                        <Field label="Confirm password" htmlFor="confirmPassword">
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={form.confirmPassword}
                                onChange={set("confirmPassword")}
                                autoComplete="new-password"
                            />
                        </Field>

                        {kind === "student" ? (
                            <Field label="Semester" htmlFor="semester">
                                <NativeSelect id="semester" value={form.semester} onChange={set("semester")}>
                                    {SEMESTERS.map((s) => (
                                        <option key={s} value={s}>
                                            Semester {s}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </Field>
                        ) : (
                            <>
                                <Field label="Role" htmlFor="role">
                                    <NativeSelect id="role" value={form.role} onChange={set("role")} disabled={isSelf}>
                                        <option value="teacher">Teacher</option>
                                        {actor?.role === "admin" && <option value="hod">Head of Department</option>}
                                        {actor?.role === "admin" && <option value="admin">Administrator</option>}
                                    </NativeSelect>
                                </Field>
                                <Field label="Teacher type" htmlFor="teacher_type" hint="Non-departmental staff also teach elsewhere">
                                    <NativeSelect id="teacher_type" value={form.teacher_type} onChange={set("teacher_type")}>
                                        <option value="departmental">Departmental</option>
                                        <option value="non_departmental">Non-departmental</option>
                                    </NativeSelect>
                                </Field>
                            </>
                        )}

                        <Field label="Account active" htmlFor="is_active">
                            <div className="flex h-9 items-center gap-2">
                                <Switch id="is_active" checked={form.is_active} onCheckedChange={set("is_active")} disabled={isSelf} />
                                <span className="text-sm text-muted-foreground">{form.is_active ? "Can sign in" : "Disabled"}</span>
                            </div>
                        </Field>

                        {kind !== "student" && (
                            <Field label="Photo" htmlFor="photo" hint="PNG, JPEG or WebP, up to 512 KB">
                                <div className="flex items-center gap-3">
                                    {form.photo && <img src={form.photo} alt="" className="h-10 w-10 rounded-full object-cover border" />}
                                    <Input id="photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} />
                                    {form.photo && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm((c) => ({ ...c, photo: null }))}>
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </Field>
                        )}
                    </div>

                    {kind !== "student" && form.role !== "admin" && (
                        <Field label="Unavailable periods">
                            <AvailabilityGrid value={form.unavailable_slots} onChange={set("unavailable_slots")} config={config} />
                        </Field>
                    )}

                    <FormError message={error} />

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : editing ? "Save changes" : `Add ${label}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
