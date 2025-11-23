import { useState } from "react";
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
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { toast } from "@/hooks/use-toast"
import {API_BASE_URL} from "@/configs/config.jsx";

export default function CreateStudentSheet() {
    const semester = [
        { value: "1", label: "Semester 1" },
        { value: "2", label: "Semester 2" },
        { value: "3", label: "Semester 3" },
        { value: "4", label: "Semester 4" },
        { value: "5", label: "Semester 5" },
        { value: "6", label: "Semester 6" },
        { value: "7", label: "Semester 7" },
        { value: "8", label: "Semester 8" },
    ];

    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        regNo: "",
        username: "",
        password: "",
        confirmPassword: "",
        semester: "",
        status: "",
    });

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
            regNo,
            username,
            password,
            confirmPassword,
            semester,
            status,
        } = formData;

        if (!firstname || !lastname || !regNo || !username || !password || !confirmPassword || !semester || !status) {
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

        // Create JSON payload
        const payload = {
            firstname,
            lastname,
            regNo: parseInt(regNo),
            username,
            password,
            semester: parseInt(semester),
            status: parseInt(status),
            profilePhoto: "", // Optional: you can add base64 photo support later
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/api/create-students`, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            console.log("Success:", response.data);
            toast({
                title: "Success",
                description: "Student added successfully.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 2000);

            // Reset form
            setFormData({
                firstname: "",
                lastname: "",
                regNo: "",
                username: "",
                password: "",
                confirmPassword: "",
                semester: "",
                status: "",
            });

        } catch (error) {
            console.error("Error submitting form:", error);
            toast({
                title: "Submission Failed",
                description: error?.response?.data?.detail || "Something went wrong while submitting the form.",
                variant: "destructive",
            });
        }
    };


    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-background text-foreground">
                <SheetHeader>
                    <SheetTitle>Add New Student</SheetTitle>
                    <SheetDescription>Fill in the user details below.</SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                    {[
                        { label: "Firstname", name: "firstname", type: "text", placeholder: "First Name" },
                        { label: "Lastname", name: "lastname", type: "text", placeholder: "Last Name" },
                        { label: "Reg.No", name: "regNo", type: "text", placeholder: "Reg.No" },
                        { label: "Username", name: "username", type: "text", placeholder: "User Name" },
                        { label: "Password", name: "password", type: "password", placeholder: "Password" },
                        { label: "Confirm Password", name: "confirmPassword", type: "password", placeholder: "Confirm Password" },
                    ].map(({ label, name, type, placeholder }) => (
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
                        <Label className="text-primary">Semester</Label>
                        <select
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select Semester</option>
                            {semester.map((sem) => (
                                <option key={sem.value} value={sem.value}>
                                    {sem.label}
                                </option>
                            ))}
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
                            <option value="0">Disable</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                    <Button onClick={handleSubmit}>Save</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
