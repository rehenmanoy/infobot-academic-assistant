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
import { Label } from "@/components/ui/label.jsx";
import { Input } from "@/components/ui/input.jsx";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import {API_BASE_URL} from "@/configs/config.jsx";

export default function CreateTeacherSheet() {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [profilePhotoBase64, setProfilePhotoBase64] = useState("");
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        empId: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "",
        status: "",
        teacher_type:""
    });

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePhotoBase64(reader.result);
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

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
            teacher_type
        } = formData;

        if (
            !firstname ||
            !lastname ||
            !empId ||
            !username ||
            !password ||
            !confirmPassword ||
            !role ||
            !status ||
            !profilePhotoBase64 ||
            !teacher_type
        ) {
            toast({
                title: "Validation Error",
                description: "All fields including profile photo are required.",
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

        const payload = {
            firstname,
            lastname,
            empId,
            username,
            password,
            role,
            status,
            profilePhoto: profilePhotoBase64,
            teacher_type
        };

        try {
            const response = await axios.post(API_BASE_URL+"/api/create_teacher", payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            console.log("Success:", response.data);
            toast({
                title: "Success",
                description: "Teacher added successfully.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Error submitting form:", error);
            toast({
                title: "Submission Failed",
                description: "Something went wrong while submitting the form.",
                variant: "destructive",
            });
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Teacher
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-background text-foreground">
                <SheetHeader>
                    <SheetTitle>Add New Teacher</SheetTitle>
                    <SheetDescription>Fill in the user details below.</SheetDescription>
                </SheetHeader>

                <ScrollArea className="w-full h-[90vh]">
                    <div className="mt-4 space-y-2">
                        <div className="w-full flex flex-col gap-1">
                            <Label className="text-primary">Profile Photo</Label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {previewUrl && (
                                <div className="mt-2">
                                    <img
                                        src={previewUrl}
                                        alt="Profile Preview"
                                        className="h-24 w-24 rounded-full object-cover border"
                                    />
                                </div>
                            )}
                        </div>

                        {[
                            {label: "Firstname", name: "firstname", type: "text", placeholder: "Firstname"},
                            {label: "Lastname", name: "lastname", type: "text", placeholder: "Last Name"},
                            {label: "Employee ID", name: "empId", type: "text", placeholder: "Employee ID"},
                            {label: "Username", name: "username", type: "text", placeholder: "User Name"},
                            {label: "Password", name: "password", type: "password", placeholder: "Password"},
                            {
                                label: "Confirm Password",
                                name: "confirmPassword",
                                type: "password",
                                placeholder: "Confirm Password"
                            },
                        ].map(({label, name, type, placeholder}) => (
                            <div className="w-full flex flex-col gap-1" key={name}>
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
                                <option value="0">Disable</option>
                            </select>
                        </div>

                        <div className="w-full flex flex-col gap-2">
                            <Label className="text-primary">Department Type</Label>
                            <select
                                name="teacher_type"
                                value={formData.teacher_type}
                                onChange={handleChange}
                                className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select Type</option>
                                <option value="1">Departmental</option>
                                <option value="2">Non-Departmental</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4">
                        <Button onClick={handleSubmit}>Save</Button>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
