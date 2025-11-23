import {Suspense} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { routesConfig } from './routes/RoutesConfig.jsx';
import { ThemeProvider } from 'next-theme';
import { Toaster } from "@/components/ui/toaster"
import LazyLoader from "@/utils/LazyLoader/LazyLoader.jsx";

function App() {


    return (


        <ThemeProvider
            enableSystem={true}
            attribute="class"
            value={{
                light: ['light_blue', 'light_green','light_yellow', 'light_red', 'light_rose','light_zinc','light_violet','light_orange'],
                dark: ['dark_blue', 'dark_green','dark_yellow', 'dark_red', 'dark_rose','dark_zinc','dark_violet','dark_orange'],
            }}
        >
            <Toaster />
        <Router>
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-screen">
                        <LazyLoader/>
                    </div>
                }
            >
                <Routes>
                    {routesConfig.map((route, index) => (
                        <Route
                            key={index}
                            path={route.path}
                            element={route.element}
                            exact={route.exact || false}
                        />
                    ))}
                </Routes>
            </Suspense>
        </Router>
        </ThemeProvider>
    );
}

export default App;
