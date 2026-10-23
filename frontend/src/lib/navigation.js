import { BookOpen, LayoutDashboard, Settings2, Sparkles, TableIcon, Users } from "lucide-react";

const MANAGERS = ["admin", "hod"];
const EVERYONE = ["admin", "hod", "teacher", "student"];

/** Single source of truth for pages: used by the router and the sidebar. */
export const NAVIGATION = [
    {
        title: "Overview",
        icon: LayoutDashboard,
        items: [{ title: "Dashboard", url: "/dashboard", roles: EVERYONE }],
    },
    {
        title: "Users",
        icon: Users,
        items: [
            { title: "Staff", url: "/manage_teachers", roles: MANAGERS },
            { title: "Students", url: "/manage_students", roles: MANAGERS },
        ],
    },
    {
        title: "Academics",
        icon: BookOpen,
        items: [{ title: "Subjects", url: "/manage_subjects", roles: EVERYONE }],
    },
    {
        title: "Timetables",
        icon: TableIcon,
        items: [
            { title: "Class Timetables", url: "/time_table", roles: EVERYONE },
            { title: "My Schedule", url: "/my_schedule", roles: ["hod", "teacher"] },
        ],
    },
    {
        title: "InfoBot",
        icon: Sparkles,
        items: [{ title: "Chat with InfoBot", url: "/chat_with_me", roles: EVERYONE }],
    },
    {
        title: "Settings",
        icon: Settings2,
        items: [{ title: "Settings", url: "/settings", roles: EVERYONE }],
    },
];

export function navigationFor(role) {
    return NAVIGATION.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter(
        (group) => group.items.length > 0,
    );
}

export function rolesFor(url) {
    for (const group of NAVIGATION) {
        const item = group.items.find((entry) => entry.url === url);
        if (item) return item.roles;
    }
    return EVERYONE;
}

export const ROLE_LABELS = { admin: "Administrator", hod: "Head of Department", teacher: "Teacher", student: "Student" };
