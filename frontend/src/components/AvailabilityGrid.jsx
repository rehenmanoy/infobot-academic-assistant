import { DEFAULT_CONFIG, SHORT_DAYS } from "@/lib/timetable.js";
import { cn } from "@/lib/utils.js";

/** Click cells to mark the periods in which a teacher cannot be scheduled. */
export default function AvailabilityGrid({ value, onChange, config = DEFAULT_CONFIG }) {
    const blocked = new Set(value.map(([day, period]) => `${day}:${period}`));

    const toggle = (day, period) => {
        const key = `${day}:${period}`;
        const next = blocked.has(key)
            ? value.filter(([d, p]) => !(d === day && p === period))
            : [...value, [day, period]];
        onChange(next.sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    };

    return (
        <div className="overflow-x-auto">
            <table className="text-xs border-separate border-spacing-1">
                <thead>
                    <tr>
                        <th />
                        {config.periods.map((period) => (
                            <th key={period.number} className="font-medium text-muted-foreground" title={`${period.start}-${period.end}`}>
                                P{period.number}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {config.days.map((day, dayIndex) => (
                        <tr key={day}>
                            <th className="pr-1 text-left font-medium text-muted-foreground">{SHORT_DAYS[day] ?? day}</th>
                            {config.periods.map((period, periodIndex) => {
                                const isBlocked = blocked.has(`${dayIndex}:${periodIndex}`);
                                return (
                                    <td key={period.number}>
                                        <button
                                            type="button"
                                            aria-pressed={isBlocked}
                                            aria-label={`${day} period ${period.number} ${isBlocked ? "unavailable" : "available"}`}
                                            onClick={() => toggle(dayIndex, periodIndex)}
                                            className={cn(
                                                "h-6 w-7 rounded border transition-colors",
                                                isBlocked
                                                    ? "bg-destructive/80 border-destructive"
                                                    : "bg-background hover:bg-muted border-input",
                                            )}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="mt-1 text-xs text-muted-foreground">
                Red periods are blocked: the timetable generator will never place this teacher there.
            </p>
        </div>
    );
}
