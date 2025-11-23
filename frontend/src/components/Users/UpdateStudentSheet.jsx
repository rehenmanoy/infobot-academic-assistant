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
import { API_BASE_URL } from "@/configs/config.jsx";

export default function UpdateStudentSheet({ student }) {
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
        empId: "",
        username: "",
        password: "",
        confirmPassword: "",
        semester: "",
        status: "",
    });

    useEffect(() => {
        if (student) {
            setFormData({
                firstname: student.firstname || "",
                lastname: student.lastname || "",
                empId: student.unique_id || "",
                username: student.email || "",
                password: "",
                confirmPassword: "",
                semester: student.semester?.toString() || "",
                status: student.status?.toString() || "",
            });
        }
    }, [student]);

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
            semester,
            status,
        } = formData;

        if (!firstname || !lastname || !empId || !username || !semester || !status) {
            toast({
                title: "Validation Error",
                description: "All fields are required except password.",
                variant: "destructive",
            });
            return;
        }

        if (password && password !== confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            id: student.id, // ✅ Required
            firstname,
            lastname,
            empId: parseInt(empId),
            username,
            semester: parseInt(semester),
            status: parseInt(status),
        };

        if (password) {
            payload.password = password;
        }

        try {
            const response = await axios.put(`${API_BASE_URL}/api/students/update`, payload);
            console.log("Updated:", response.data);
            toast({
                title: "Success",
                description: "Student updated successfully.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Update failed:", error);
            toast({
                title: "Update Failed",
                description: error?.response?.data?.detail || "Something went wrong while updating the student.",
                variant: "destructive",
            });
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    size="sm"
                    variant="outlined"
                    className="text-primary border-2 border-primary bg-transparent hover:scale-105 hover:text-primary font-bold"
                >
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-background text-foreground">
                <SheetHeader>
                    <SheetTitle>Update Student</SheetTitle>
                    <SheetDescription>Modify the student details below.</SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                    {[
                        { name: "firstname", label: "Firstname", placeholder: "Firstname" },
                        { name: "lastname", label: "Lastname", placeholder: "Last Name" },
                        { name: "empId", label: "Student ID", placeholder: "Student ID" },
                        { name: "username", label: "Username", placeholder: "User Name" },
                        { name: "password", label: "Password", placeholder: "New Password (optional)", type: "password" },
                        {
                            name: "confirmPassword",
                            label: "Confirm Password",
                            placeholder: "Confirm Password",
                            type: "password",
                        },
                    ].map(({ name, label, placeholder, type = "text" }) => (
                        <div key={name} className="w-full flex flex-col gap-2">
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
                    <Button onClick={handleSubmit}>Update</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
