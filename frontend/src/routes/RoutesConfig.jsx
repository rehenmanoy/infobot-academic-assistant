import { lazy } from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoutes.jsx";
import { rolesFor } from "@/lib/navigation.js";

const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const DashboardLayout = lazy(() => import("../layout/dashboard.jsx"));
const Home = lazy(() => import("../pages/Home.jsx"));
const ChatWithMe = lazy(() => import("../pages/Chat_with_me.jsx"));
const ManageSubjects = lazy(() => import("../pages/Manage_subjects.jsx"));
const Timetable = lazy(() => import("../pages/Timetable.jsx"));
const MySchedule = lazy(() => import("../pages/My_schedule.jsx"));
const ManageTeachers = lazy(() => import("../pages/Manage_teacher.jsx"));
const ManageStudents = lazy(() => import("../pages/Manage_students.jsx"));
const Settings = lazy(() => import("../pages/Settings.jsx"));

const pages = [
    ["/dashboard", Home],
    ["/manage_teachers", ManageTeachers],
    ["/manage_students", ManageStudents],
    ["/manage_subjects", ManageSubjects],
    ["/time_table", Timetable],
    ["/my_schedule", MySchedule],
    ["/chat_with_me", ChatWithMe],
    ["/settings", Settings],
];

export const routesConfig = [
    { path: "/", element: <LoginPage /> },
    ...pages.map(([path, Page]) => ({
        path,
        element: (
            <ProtectedRoute roles={rolesFor(path)}>
                <DashboardLayout>
                    <Page />
                </DashboardLayout>
            </ProtectedRoute>
        ),
    })),
    { path: "*", element: <Navigate to="/dashboard" replace /> },
];
