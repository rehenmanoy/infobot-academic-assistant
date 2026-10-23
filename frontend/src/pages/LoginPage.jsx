import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Field, FormError } from "@/components/form.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { errorMessage } from "@/lib/api.js";
import logo from "@/assets/images/logo.png";
import loginbg from "../assets/images/login-bg.svg";

export default function LoginPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const destination = location.state?.from && location.state.from !== "/" ? location.state.from : "/dashboard";
    if (user) return <Navigate to={destination} replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await login(username.trim(), password);
            navigate(destination, { replace: true });
        } catch (err) {
            setError(errorMessage(err, "Could not sign in. Please try again."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-zinc-950">
            <img className="hidden h-screen w-2/5 object-cover lg:block" src={loginbg} alt="" />
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="items-center text-center">
                        <img className="h-16 w-16" src={logo} alt="InfoBot logo" />
                        <CardTitle className="text-2xl">Welcome to InfoBot</CardTitle>
                        <CardDescription>Sign in with the account your department gave you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <Field label="Username" htmlFor="username">
                                <Input
                                    id="username"
                                    autoComplete="username"
                                    autoFocus
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </Field>
                            <Field label="Password" htmlFor="password">
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Field>
                            <FormError message={error} />
                            <Button type="submit" disabled={submitting} className="w-full">
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Sign in
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">Forgot your password? Ask your department administrator to reset it.</p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
