import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        // Forward API calls to the FastAPI dev server so the browser sees one origin.
        proxy: {
            "/api": process.env.VITE_PROXY_TARGET ?? "http://localhost:8000",
        },
    },
});
