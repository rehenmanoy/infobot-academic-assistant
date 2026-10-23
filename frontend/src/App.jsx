import { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { routesConfig } from "./routes/RoutesConfig.jsx";
import { Toaster } from "@/components/ui/toaster";
import LazyLoader from "@/utils/LazyLoader/LazyLoader.jsx";
import { AuthProvider } from "@/auth/AuthContext.jsx";

function App() {
    return (
        <AuthProvider>
            <Toaster />
            <Router>
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center h-screen">
                            <LazyLoader />
                        </div>
                    }
                >
                    <Routes>
                        {routesConfig.map((route) => (
                            <Route key={route.path} path={route.path} element={route.element} />
                        ))}
                    </Routes>
                </Suspense>
            </Router>
        </AuthProvider>
    );
}

export default App;
