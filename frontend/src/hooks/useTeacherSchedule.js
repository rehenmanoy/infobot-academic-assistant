import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast.jsx";
import { api, errorMessage } from "@/lib/api.js";

/** A teacher's classes across all saved timetables; null while loading. */
export function useTeacherSchedule(teacherId) {
    const [entries, setEntries] = useState(null);
    useEffect(() => {
        if (!teacherId) return;
        api.get(`/timetables/teachers/${teacherId}`)
            .then((response) => setEntries(response.data))
            .catch((error) => {
                setEntries([]);
                toast({ title: "Could not load your schedule", description: errorMessage(error), variant: "destructive" });
            });
    }, [teacherId]);
    return entries;
}
