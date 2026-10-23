import { forwardRef } from "react";
import { Label } from "@/components/ui/label.jsx";
import { cn } from "@/lib/utils.js";

export function Field({ label, htmlFor, hint, className, children }) {
    return (
        <div className={cn("grid gap-1.5", className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
    return (
        <select
            ref={ref}
            className={cn(
                "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
                className,
            )}
            {...props}
        >
            {children}
        </select>
    );
});

export function FormError({ message }) {
    if (!message) return null;
    return (
        <div role="alert" className="whitespace-pre-line rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
        </div>
    );
}

export function Badge({ children, tone = "default", className }) {
    const tones = {
        default: "bg-muted text-foreground",
        primary: "bg-primary/15 text-primary",
        success: "bg-green-500/15 text-green-700 dark:text-green-400",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        danger: "bg-destructive/15 text-destructive",
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
            {children}
        </span>
    );
}

export function EmptyState({ title, children }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">{title}</p>
            {children && <div className="text-sm text-muted-foreground">{children}</div>}
        </div>
    );
}
