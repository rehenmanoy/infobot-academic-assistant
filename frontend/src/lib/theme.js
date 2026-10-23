export const THEME_COLORS = [
    { value: "zinc", swatch: "bg-zinc-600", label: "Zinc" },
    { value: "red", swatch: "bg-red-700", label: "Red" },
    { value: "rose", swatch: "bg-rose-600", label: "Rose" },
    { value: "orange", swatch: "bg-orange-600", label: "Orange" },
    { value: "green", swatch: "bg-green-600", label: "Green" },
    { value: "blue", swatch: "bg-blue-600", label: "Blue" },
    { value: "yellow", swatch: "bg-yellow-600", label: "Yellow" },
    { value: "violet", swatch: "bg-violet-600", label: "Violet" },
];

export const DEFAULT_THEME = { theme: "light", color: "blue" };

export function normalizeTheme(preferences) {
    const theme = preferences?.theme === "dark" ? "dark" : "light";
    const color = THEME_COLORS.some((c) => c.value === preferences?.color) ? preferences.color : DEFAULT_THEME.color;
    return { theme, color };
}

/** Apply a theme by setting e.g. `dark_green` (CSS variables) and `dark` (Tailwind variants) on <html>. */
export function applyTheme(preferences) {
    const { theme, color } = normalizeTheme(preferences);
    const root = document.documentElement;
    [...root.classList]
        .filter((name) => name.startsWith("light_") || name.startsWith("dark_"))
        .forEach((name) => root.classList.remove(name));
    root.classList.add(`${theme}_${color}`);
    root.classList.toggle("dark", theme === "dark");
}
