import axios from "axios";

const TOKEN_KEY = "infobot.token";

// In production the frontend and API share an origin (nginx proxies /api), so the base URL is empty.
export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`,
    timeout: 60_000,
});

export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Storage can be unavailable (private mode); the session then lasts until reload.
    }
}

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLogin = error.config?.url?.endsWith("/auth/login");
        if (error.response?.status === 401 && !isLogin) {
            setToken(null);
            onUnauthorized();
        }
        return Promise.reject(error);
    },
);

/** Turn an axios/FastAPI error into a readable sentence. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
        return detail
            .map((item) => {
                const field = item.loc?.filter((part) => part !== "body").join(".");
                const message = (item.msg || "").replace(/^Value error, /, "");
                return field ? `${field}: ${message}` : message;
            })
            .join("\n");
    }
    if (error?.code === "ERR_NETWORK") return "Cannot reach the server. Check your connection.";
    return fallback;
}

/** Download a file from an authenticated endpoint. */
export async function downloadFile(url, filename) {
    const response = await api.get(url, { responseType: "blob" });
    const href = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
}
