
import {lazy} from 'react';
import ProtectedRoute from './ProtectedRoutes.jsx';

const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));

const DashboardIndex = lazy(() => import('../layout/dashboard.jsx'));
const Home = lazy(() => import('../pages/Home.jsx'));
const Chat_with_me = lazy(() => import('../pages/Chat_with_me.jsx'));
const Manage_semester = lazy(() => import('../pages/Manage_semester.jsx'));
const Timetable = lazy(() => import('../pages/Timetable.jsx'));
const Manage_prompts = lazy(() => import('../pages/Manage_Prompts.jsx'));
const Manage_teachers = lazy(() => import('../pages/Manage_teacher.jsx'));
const Manage_students = lazy(() => import('../pages/Manage_students.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));
export const routesConfig = [
    {
        path: '/',
        element: <LoginPage />,
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Home />
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },
    {
        path: '/manage_teachers',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Manage_teachers />
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },
    {
        path: '/manage_students',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Manage_students />
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },,{
        path: '/chat_with_me',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Chat_with_me/>
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },{
        path: '/manage_semester',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Manage_semester/>
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },{
        path: '/manage_prompt',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Manage_prompts/>
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },{
        path: '/time_table',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Timetable/>
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },
    {
        path: '/settings',
        element: (
            <ProtectedRoute>
                <DashboardIndex>
                    <Settings/>
                </DashboardIndex>
            </ProtectedRoute>
        ),
    },

];