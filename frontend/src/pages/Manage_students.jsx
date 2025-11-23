/*
 Created on 23-03-2025
 Project: frontend
 Author: Donis Abraham
*/

import { useEffect, useState } from "react";
import axios from "axios";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table.jsx";
import CreateStudentSheet from "@/components/Users/CreateStudentSheet.jsx";
import UpdateStudentSheet from "@/components/Users/UpdateStudentSheet.jsx";
import DeleteStudentDialog from "@/components/Users/DeleteStudentSheet.jsx";
import { toast } from "@/hooks/use-toast";
import {API_BASE_URL} from "@/configs/config.jsx";

export default function Manage_students() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        try {
            const response = await axios.get(API_BASE_URL+"/api/students");
            setUsers(Array.isArray(response.data) ? response.data : response.data.data || []);
            console.log(response.data);
            if (response.data.status_code === "400") {
                toast({title: "Fetch Error",
                    description: response.data.detail,
                    })
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            toast({
                title: "Fetch Error",
                description: "Failed to load students from the server.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return (
        <div className="w-full h-full bg-background rounded-lg p-2 flex flex-col">
            <h3 className="text-primary font-bold text-2xl">Manage Students</h3>

            <div className="w-full h-[60px] flex justify-end p-2">
                <CreateStudentSheet onCreated={fetchStudents} />
            </div>

            <div className="w-full h-full p-4 bg-datatable rounded-lg">
                {loading ? (
                    <p className="text-muted-foreground">Loading students...</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Id</TableHead>
                                <TableHead className="font-bold">First Name</TableHead>
                                <TableHead className="font-bold">Last Name</TableHead>
                                <TableHead className="font-bold">Student ID</TableHead>
                                <TableHead className="font-bold">User Name</TableHead>
                                <TableHead className="font-bold">Semester</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="font-bold text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {users.map((user, index) => (
                                <TableRow key={user.id}>
                                    <TableCell>{index + 1}</TableCell> {/* Serial Number */}
                                    <TableCell>{user.firstname}</TableCell>
                                    <TableCell>{user.lastname}</TableCell>
                                    <TableCell>{user.unique_id}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.semester}</TableCell>
                                    <TableCell>
                                        {user.status === 1 ? "Active" : "Disable"} {/* Status label */}
                                    </TableCell>
                                    <TableCell className="flex space-x-2 items-center">
                                        <UpdateStudentSheet student={user} />
                                        <DeleteStudentDialog studentId={user.id} onDeleted={fetchStudents} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>

                    </Table>
                )}
            </div>
        </div>
    );
}
