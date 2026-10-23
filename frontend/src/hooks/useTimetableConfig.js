import { useEffect, useState } from "react";
import { api } from "@/lib/api.js";
import { DEFAULT_CONFIG } from "@/lib/timetable.js";

let cached = null;

/** Days, periods and lab rules from the server (falls back to the defaults while loading). */
export function useTimetableConfig() {
    const [config, setConfig] = useState(cached ?? DEFAULT_CONFIG);

    useEffect(() => {
        if (cached) return;
        let cancelled = false;
        api.get("/timetables/config")
            .then((response) => {
                cached = response.data;
                if (!cancelled) setConfig(response.data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    return config;
}
