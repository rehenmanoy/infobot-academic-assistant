import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/configs/config.jsx";
import CreateTeacherSheet from "../components/Users/CreateTeacherSheet.jsx";
import UpdateTeacherSheet from "../components/Users/UpdateTeacherSheet.jsx";
import DeleteTeacherDialog from "../components/Users/DeleteTeacherDialog.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area.jsx";

export default function Manage_teacher() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTeachers = async () => {
        try {
            const response = await axios.get(API_BASE_URL + "/api/teachers");
            setTeachers(Array.isArray(response.data) ? response.data : response.data.data || []);

            if (response.data.status_code === "400") {
                toast({
                    title: "Fetch Error",
                    description: response.data.detail,
                });
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            toast({
                title: "Fetch Error",
                description: "Failed to load teachers from the server.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    return (
        <div className="w-full h-full bg-background rounded-lg p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-primary font-bold text-2xl">Manage Teachers</h3>
                <CreateTeacherSheet onCreated={fetchTeachers} />
            </div>

            {loading ? (
                <p className="text-muted-foreground">Loading teachers...</p>
            ) : (
                <ScrollArea className="w-full h-[90vh]">

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 p-4">

                    {teachers.map((teacher) => (
                        <Card key={teacher.id} className="shadow-md hover:shadow-lg transition-all duration-300 border border-border">
                            <CardHeader className="flex items-center space-x-4">
                                <img
                                    src={`data:image/jpeg;base64,${teacher.profilePhoto}`}
                                    alt="Teacher"
                                    className="w-16 h-16 rounded-full object-cover border"
                                />
                                <CardTitle className="text-lg font-semibold">
                                    {teacher.firstname} {teacher.lastname}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="text-sm space-y-1">
                                <div><span className="font-medium">Employee ID:</span> {teacher.empId	}</div>
                                <div><span className="font-medium">Username:</span> {teacher.username}</div>
                                <div><span className="font-medium">Role:</span> {teacher.role}</div>
                            </CardContent>

                            <div className="flex justify-end gap-2 p-4 pt-2">
                                <UpdateTeacherSheet teacher={teacher} />
                                <DeleteTeacherDialog teacherId={teacher.id} onDeleted={fetchTeachers} />
                            </div>
                        </Card>
                    ))}
                </div>
                </ScrollArea>

            )}
        </div>
    );
}
