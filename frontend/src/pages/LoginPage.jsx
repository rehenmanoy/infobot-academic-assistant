import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage.jsx";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import login from "../api/login/login.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Label } from "@/components/ui/label.jsx";
import logo from "@/assets/images/logo.png"
import loginbg from "../assets/images/login-bg.svg"


const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { setToken } = useLocalStorage();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (!email.trim()) {
                toast.error("Email cannot be empty!");
                return;
            }
            if (!password.trim()) {
                toast.error("Password cannot be empty!");
                return;
            }

            const response = await login(email, password);
            localStorage.setItem("permissions", JSON.stringify(response.permission))


            if (response?.access_token) {
                toast.success("Hi, welcome to Infobot!");
                setToken(response.access_token);

                setTimeout(() => {
                    navigate("/dashboard");
                }, 1500);
            } else {
                toast.error("Invalid login credentials!");
            }
        } catch (error) {
            console.error("Login error:", error);

            if (error.message === "Network Error") {
                toast.error("Network error. Please check your connection and try again.");
                setTimeout(() => navigate("/Error"), 2000);
            } else {
                toast.error("An error occurred while logging in. Please try again later.");
            }
        }
    };

    const handleEnterKey = (e) => {
        if (e.key === 'Enter' && email && password) {
            handleSubmit(e);
        }
    };

    return (
        <div className="w-screen h-screen flex flex-row bg-black">
            <img className="w-2/5 h-full object-cover" src={loginbg} alt="Login Background"/>
            <div className="w-[60vw] h-full  flex items-center justify-center">

                <Card className="w-[400px] overflow-hidden items-center flex flex-col">
                    <CardHeader className="flex items-center justify-center text-white">
                        <CardTitle className="text-2xl text-white">Welcome to InfoBot</CardTitle>
                        <img className="w-[80px] h-[80px]" src={logo}/>
                    </CardHeader>
                    <CardContent className="min-w-[300px]">
                        <form onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label className="text-white" htmlFor="email">Email</Label>
                                    <Input
                                        className="w-full rounded-xl text-white border-2 border-white"
                                        id="email"
                                        type="email"
                                        placeholder="username"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={handleEnterKey}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-white" htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        placeholder="password"
                                        className="w-full text-white rounded-xl border-2 border-white"
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={handleEnterKey}
                                    />
                                </div>
                                <div className="flex w-full items-center justify-center">
                                    <Button type="submit"
                                            className="w-[100px] text-white hover:bg-cyan-950 hover:scale-105 bg-cyan-950 rounded-xl">
                                        Login
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 text-center text-sm">
                                Don&#39;t have an account?{" "}
                                <a href="#" className="underline underline-offset-4">Sign up</a>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                <ToastContainer/>
            </div>
        </div>
    );
};

export default Login;
