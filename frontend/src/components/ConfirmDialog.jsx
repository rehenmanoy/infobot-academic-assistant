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

/** A confirmation dialog for destructive actions. `onConfirm` may be async. */
export default function ConfirmDialog({ trigger, title, description, confirmLabel = "Delete", onConfirm }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        setBusy(true);
        try {
            await onConfirm();
            setOpen(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirm} disabled={busy}>
                        {busy ? "Working..." : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
