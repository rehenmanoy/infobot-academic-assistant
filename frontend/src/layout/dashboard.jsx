import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { AppSidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/hooks/use-toast.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { api, errorMessage } from "@/lib/api.js";
import { NAVIGATION } from "@/lib/navigation.js";
import { applyTheme, DEFAULT_THEME, normalizeTheme, THEME_COLORS } from "@/lib/theme.js";

const toggleItemClass =
    "data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=off]:border-muted " +
    "data-[state=off]:text-muted-foreground border-2 rounded-md flex flex-row justify-start items-center gap-2 p-2";

function pageTitle(pathname) {
    for (const group of NAVIGATION) {
        const item = group.items.find((entry) => entry.url === pathname);
        if (item) return item.title;
    }
    return "";
}

function ThemeCustomizer() {
    const { user, setUser } = useAuth();
    const [draft, setDraft] = useState(() => normalizeTheme(user?.preferences));
    const [saving, setSaving] = useState(false);

    // Preview while choosing; the saved theme comes back when the popover closes without saving.
    useEffect(() => applyTheme(draft), [draft]);

    const save = async () => {
        setSaving(true);
        try {
            const response = await api.put("/auth/me/preferences", draft);
            setUser(response.data);
            toast({ title: "Theme saved", description: "Your theme will follow you on every device." });
        } catch (error) {
            toast({ title: "Could not save theme", description: errorMessage(error), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Popover onOpenChange={(open) => !open && setDraft(normalizeTheme(user?.preferences))}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Theme settings">
                    <Palette className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-col gap-4 w-[330px]">
                <div className="flex flex-row justify-between items-center">
                    <span className="font-bold">Theme</span>
                    <Button variant="ghost" size="icon" aria-label="Reset theme" onClick={() => setDraft(DEFAULT_THEME)}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
                <Separator />
                <span className="text-sm text-muted-foreground">Color</span>
                <ToggleGroup
                    type="single"
                    value={draft.color}
                    className="grid grid-cols-3 gap-2"
                    onValueChange={(color) => color && setDraft((d) => ({ ...d, color }))}
                >
                    {THEME_COLORS.map((item) => (
                        <ToggleGroupItem key={item.value} value={item.value} className={toggleItemClass}>
                            <span className={`w-4 h-4 rounded-full ${item.swatch}`} />
                            <span>{item.label}</span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <span className="text-sm text-muted-foreground">Mode</span>
                <ToggleGroup
                    type="single"
                    value={draft.theme}
                    className="flex gap-4"
                    onValueChange={(theme) => theme && setDraft((d) => ({ ...d, theme }))}
                >
                    <ToggleGroupItem value="light" className={toggleItemClass}>
                        <Sun size={18} /> Light
                    </ToggleGroupItem>
                    <ToggleGroupItem value="dark" className={toggleItemClass}>
                        <Moon size={18} /> Dark
                    </ToggleGroupItem>
                </ToggleGroup>
                <Separator />
                <Button onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save theme"}
                </Button>
            </PopoverContent>
        </Popover>
    );
}

export default function DashboardLayout({ children }) {
    const { user } = useAuth();
    const { pathname } = useLocation();

    useEffect(() => applyTheme(user?.preferences), [user?.preferences]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="p-1 min-w-0">
                <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <h1 className="font-semibold truncate">{pageTitle(pathname)}</h1>
                    </div>
                    <ThemeCustomizer />
                </header>
                <main className="flex flex-1 flex-col gap-2 p-2 sm:p-4 bg-muted/50 rounded-lg min-w-0">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
