import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "@/lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(getToken()));
    // True after a deliberate logout, so the next person is not sent back to the previous user's page.
    const [loggedOut, setLoggedOut] = useState(false);

    const clear = useCallback(() => {
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(clear);
        if (!getToken()) return;
        api.get("/auth/me")
            .then((response) => setUser(response.data))
            .catch(clear)
            .finally(() => setLoading(false));
    }, [clear]);

    const login = useCallback(async (username, password) => {
        const response = await api.post("/auth/login", { username, password });
        setToken(response.data.access_token);
        setLoggedOut(false);
        setUser(response.data.user);
        return response.data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // The token may already be invalid; logging out locally is enough.
        }
        setLoggedOut(true);
        clear();
    }, [clear]);

    const value = useMemo(
        () => ({ user, loading, loggedOut, login, logout, setUser, isManager: ["admin", "hod"].includes(user?.role) }),
        [user, loading, loggedOut, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
    return context;
}
