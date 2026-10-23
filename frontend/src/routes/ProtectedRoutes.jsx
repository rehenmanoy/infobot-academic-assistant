import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext.jsx";
import LazyLoader from "@/utils/LazyLoader/LazyLoader.jsx";

export default function ProtectedRoute({ children, roles }) {
    const { user, loading, loggedOut } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LazyLoader />
            </div>
        );
    }
    if (!user) {
        // Remember the page only when the session expired, not after a deliberate logout.
        return <Navigate to="/" replace state={loggedOut ? undefined : { from: location.pathname }} />;
    }
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

