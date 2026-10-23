import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import UserFormDialog from "@/components/UserFormDialog.jsx";
import { Badge, EmptyState } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { useTimetableConfig } from "@/hooks/useTimetableConfig.js";
import { api, errorMessage } from "@/lib/api.js";
import { ROLE_LABELS } from "@/lib/navigation.js";

export default function ManageStaff() {
    const { user: actor } = useAuth();
    const config = useTimetableConfig();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    const load = useCallback(async () => {
        try {
            const response = await api.get("/users", { params: { role: ["admin", "hod", "teacher"] }, paramsSerializer: { indexes: null } });
            setStaff(response.data);
        } catch (error) {
            toast({ title: "Could not load staff", description: errorMessage(error), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const remove = async (member) => {
        try {
            await api.delete(`/users/${member.id}`);
            toast({ title: "Deleted", description: `${member.full_name} was removed. Their subjects are now unassigned.` });
            load();
        } catch (error) {
            toast({ title: "Could not delete", description: errorMessage(error), variant: "destructive" });
        }
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return staff.filter((m) => !q || `${m.full_name} ${m.username} ${m.identifier ?? ""}`.toLowerCase().includes(q));
    }, [staff, query]);

    const canManage = (member) => actor.role === "admin" || member.role === "teacher";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search staff..." className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <UserFormDialog
                    kind="staff"
                    config={config}
                    onSaved={load}
                    trigger={
                        <Button>
                            <Plus className="h-4 w-4" /> Add staff member
                        </Button>
                    }
                />
            </div>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((n) => (
                        <Skeleton key={n} className="h-40" />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyState title={query ? "No staff match your search" : "No staff yet"}>Add teachers so you can assign them to subjects.</EmptyState>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visible.map((member) => (
                        <Card key={member.id} className={member.is_active ? "" : "opacity-60"}>
                            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                                <Avatar className="h-12 w-12">
                                    {member.photo && <AvatarImage src={member.photo} alt="" className="object-cover" />}
                                    <AvatarFallback>{`${member.first_name[0]}${member.last_name[0]}`.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-semibold truncate">{member.full_name}</p>
                                    <p className="text-sm text-muted-foreground truncate">@{member.username}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 text-sm">
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge tone="primary">{ROLE_LABELS[member.role]}</Badge>
                                    {member.teacher_type === "non_departmental" && <Badge>Non-departmental</Badge>}
                                    {!member.is_active && <Badge tone="danger">Disabled</Badge>}
                                    {member.unavailable_slots.length > 0 && <Badge tone="warning">{member.unavailable_slots.length} blocked periods</Badge>}
                                </div>
                                {member.identifier && <p className="text-muted-foreground">Employee ID: {member.identifier}</p>}
                                {canManage(member) && (
                                    <div className="flex justify-end gap-2">
                                        <UserFormDialog
                                            kind="staff"
                                            user={member}
                                            config={config}
                                            onSaved={load}
                                            trigger={
                                                <Button variant="outline" size="sm" aria-label={`Edit ${member.full_name}`}>
                                                    <Pencil className="h-4 w-4" /> Edit
                                                </Button>
                                            }
                                        />
                                        {member.id !== actor.id && (
                                            <ConfirmDialog
                                                title={`Delete ${member.full_name}?`}
                                                description="This cannot be undone. Subjects they teach will become unassigned."
                                                onConfirm={() => remove(member)}
                                                trigger={
                                                    <Button variant="outline" size="sm" aria-label={`Delete ${member.full_name}`}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
