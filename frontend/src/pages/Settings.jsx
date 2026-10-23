import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Field, FormError } from "@/components/form.jsx";
import { toast } from "@/hooks/use-toast.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api, errorMessage } from "@/lib/api.js";

function ChangePassword() {
    const { logout } = useAuth();
    const [form, setForm] = useState({ current: "", next: "", confirm: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        if (form.next !== form.confirm) return setError("The new passwords do not match.");
        setSaving(true);
        try {
            await api.post("/auth/me/password", { current_password: form.current, new_password: form.next });
            toast({ title: "Password changed", description: "Please sign in again with your new password." });
            await logout();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Change password</CardTitle>
                <CardDescription>You will be signed out of every device.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid max-w-md gap-4">
                    <Field label="Current password" htmlFor="current">
                        <Input id="current" type="password" autoComplete="current-password" value={form.current} onChange={set("current")} required />
                    </Field>
                    <Field label="New password" htmlFor="next" hint="At least 8 characters, not only letters or digits">
                        <Input id="next" type="password" autoComplete="new-password" value={form.next} onChange={set("next")} required minLength={8} />
                    </Field>
                    <Field label="Confirm new password" htmlFor="confirm">
                        <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
                    </Field>
                    <FormError message={error} />
                    <Button type="submit" disabled={saving} className="w-fit">
                        {saving ? "Saving..." : "Change password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function AssistantPrompt() {
    const [text, setText] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [saving, setSaving] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(true);

    useEffect(() => {
        api.get("/prompts")
            .then((response) => {
                setText(response.data[0].text);
                setUpdatedAt(response.data[0].updated_at);
            })
            .catch((error) => toast({ title: "Could not load the prompt", description: errorMessage(error), variant: "destructive" }));
        api.get("/health").then((response) => setAiEnabled(response.data.ai_enabled)).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const response = await api.put("/prompts/assistant", { text });
            setUpdatedAt(response.data.updated_at);
            toast({ title: "Prompt saved", description: "InfoBot uses it from the next message." });
        } catch (error) {
            toast({ title: "Could not save", description: errorMessage(error), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">InfoBot instructions</CardTitle>
                <CardDescription>
                    The system prompt for the assistant. The user&apos;s name, role, subjects and timetable are added automatically.
                    {!aiEnabled && " The assistant is currently disabled: set ANTHROPIC_API_KEY on the server to enable it."}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={8000} aria-label="Assistant prompt" />
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{updatedAt && `Last saved ${new Date(updatedAt).toLocaleString()}`}</span>
                    <Button onClick={save} disabled={saving || !text.trim()}>
                        {saving ? "Saving..." : "Save prompt"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Settings() {
    const { user } = useAuth();
    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <ChangePassword />
            {user.role === "admin" && <AssistantPrompt />}
        </div>
    );
}
