/*
 Created on 05-02-2025
 Project: frontend
 Author: Donis Abraham
*/

import { useEffect, useState } from "react";
import axios from "axios";
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import { Label } from "@/components/ui/label.jsx";
import { Input } from "@/components/ui/input.jsx";
import { toast } from "@/hooks/use-toast";
import {API_BASE_URL} from "@/configs/config.jsx";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// 👇 Accept 'teacher' as a prop
export default function UpdateTeacherSheet({ teacher }) {
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        empId: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "",
        status: "",
    });

    // 👇 Populate state when teacher prop changes
    useEffect(() => {
        if (teacher) {
            setFormData({
                firstname: teacher.firstname || "",
                lastname: teacher.lastname || "",
                empId: teacher.empId || "",
                username: teacher.username || "",
                password: "",              // leave blank for security
                confirmPassword: "",
                role: teacher.role || "",
                status: teacher.status || "",
            });
        }
    }, [teacher]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        const {
            firstname,
            lastname,
            empId,
            username,
            password,
            confirmPassword,
            role,
            status,
        } = formData;

        if (
            !firstname ||
            !lastname ||
            !empId ||
            !username ||
            !password ||
            !confirmPassword ||
            !role ||
            !status
        ) {
            toast({
                title: "Validation Error",
                description: "All fields are required.",
                variant: "destructive",
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await axios.put(API_BASE_URL+"/api/update-teacher", {
                firstname,
                lastname,
                empId,
                username,
                password,
                role,
                status,
            });
            toast({
                title: "Success",
                description: "Teacher updated successfully.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            toast({
                title: "Update Failed",
                description: "Something went wrong while updating the teacher.",
                variant: "destructive",
            });
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            variant="outlined"
                            className="text-primary bg-primary hover:scale-105 hover:text-primary font-bold"
                        >
                            <EditIcon className="w-4 h-4 bg-primary-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Edit</p>
                    </TooltipContent>
                </Tooltip>
            </SheetTrigger>

            <SheetContent side="right" className="bg-background text-foreground">
                <SheetHeader>
                    <SheetTitle>Update User</SheetTitle>
                    <SheetDescription>Modify the user details below.</SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                    {[
                        { label: "Firstname", name: "firstname", placeholder: "Firstname" },
                        { label: "Lastname", name: "lastname", placeholder: "Last Name" },
                        { label: "Employee ID", name: "empId", placeholder: "Employee ID" },
                        { label: "Username", name: "username", placeholder: "User Name" },
                        { label: "Password", name: "password", placeholder: "Password", type: "password" },
                        { label: "Confirm Password", name: "confirmPassword", placeholder: "Confirm Password", type: "password" },
                    ].map(({ label, name, placeholder, type = "text" }) => (
                        <div className="w-full flex flex-col gap-2" key={name}>
                            <Label className="text-primary">{label}</Label>
                            <Input
                                type={type}
                                name={name}
                                value={formData[name]}
                                onChange={handleChange}
                                placeholder={placeholder}
                                className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}

                    <div className="w-full flex flex-col gap-2">
                        <Label className="text-primary">Role</Label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select Role</option>
                            <option value="4">Teacher</option>
                            <option value="2">HOD</option>
                        </select>
                    </div>

                    <div className="w-full flex flex-col gap-2">
                        <Label className="text-primary">Status</Label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select Status</option>
                            <option value="1">Active</option>
                            <option value="2">Disable</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                    <Button onClick={handleSubmit}>Update</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
