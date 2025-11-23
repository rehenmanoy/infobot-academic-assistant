import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { API_BASE_URL } from "@/configs/config.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet.jsx";
import {toast} from "@/hooks/use-toast.jsx";

export default function ManageSemester() {
    const [selectedSemester, setSelectedSemester] = useState("");
    const [subject, setSubject] = useState({
        name: "",
        type: "",
        file: null,
        teacher: "",
        lecture_time: "",
        theory_time: "",
        practical_time: "",
        credit: "",
        code: "",
        notation: ""
    });

    const [subjectTypes, setSubjectTypes] = useState([]);
    const [teacherOptions, setTeacherOptions] = useState([]);
    const [subjectList, setSubjectList] = useState([]);

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

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!selectedSemester) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/subjects?semester=${selectedSemester}`);
                if (!res.ok) throw new Error("Failed to fetch subject list");
                const data = await res.json();
                setSubjectList(data);
            } catch (error) {
                console.error("Error fetching subjects:", error);
                setSubjectList([]);
            }
        };

        fetchSubjects();
    }, [selectedSemester]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [teacherRes, typeRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/teachers-data`),
                    fetch(`${API_BASE_URL}/api/subject-types`)
                ]);

                const teachers = await teacherRes.json();
                const types = await typeRes.json();

                setTeacherOptions(Array.isArray(teachers) ? teachers : []);
                setSubjectTypes(Array.isArray(types) ? types : []);
            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                setTeacherOptions([]);
                setSubjectTypes([]);
            }
        };

        fetchData();
    }, []);

    const handleInputChange = (key, value) => {
        setSubject((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!selectedSemester) {
            alert("Please select a semester.");
            return;
        }

        if (!subject.file || !subject.name || !subject.type || !subject.teacher) {
            alert("Please fill all required fields.");
            return;
        }

        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        const base64File = await fileToBase64(subject.file);

        const payload = {
            semester: selectedSemester,
            subject: {
                name: subject.name,
                file_name: subject.file.name,
                file_content: base64File,
                type_id: subject.type,
                teacher_id: subject.teacher,
                lecture_time: subject.lecture_time,
                theory_time: subject.theory_time,
                practical_time: subject.practical_time,
                credit: subject.credit,
                code: subject.code,
                notation: subject.notation
            }
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/upload-semester`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error("Failed to submit subject");
            }
            toast({
                title: "Success",
                description: "New Subject added.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            setSubject({
                name: "",
                type: "",
                file: null,
                teacher: "",
                lecture_time: "",
                theory_time: "",
                practical_time: "",
                credit: "",
                code: "",
                notation: ""
            });

        } catch (err) {
            console.error(err);
            alert("Submission failed!");
        }
    };

    const handleChange = (e) => {
        setSelectedSemester(e.target.value);
    };

    const handleDownload = (subject) => {
        if (!subject?.file_content || !subject?.filename) {
            alert("No file available.");
            return;
        }

        const byteCharacters = atob(subject.file_content);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }

        const blob = new Blob(byteArrays, { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = subject.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-auto">
            <h3 className="text-primary font-bold text-2xl">Manage Semester</h3>
            <div className="w-full flex flex-col gap-2 mt-4">
                <div className="w-full flex flex-col gap-2">
                    <Label className="text-primary">Select a Semester</Label>
                    <select
                        name="semester"
                        value={selectedSemester}
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

                {selectedSemester && (
                    <div className="mt-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button>Add New Subject</Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:w-[600px]">
                                <SheetHeader>
                                    <SheetTitle>Add Subject for Semester {selectedSemester}</SheetTitle>
                                </SheetHeader>

                                <ScrollArea className="w-full h-[90vh] mt-4 pr-2">
                                    <div className="border p-4 rounded-lg flex flex-col gap-4 bg-muted">
                                        <div className="flex flex-col gap-2">
                                            <div>
                                                <Label>Subject Name</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    placeholder="Enter subject name here"
                                                    value={subject.name}
                                                    onChange={(e) =>
                                                        handleInputChange("name", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Subject Type</Label>
                                                <select
                                                    value={subject.type}
                                                    onChange={(e) =>
                                                        handleInputChange("type", e.target.value)
                                                    }
                                                    className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="">Select type</option>
                                                    {subjectTypes.map((type) => (
                                                        <option key={type.id} value={type.id}>
                                                            {type.type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Teacher</Label>
                                                <select
                                                    value={subject.teacher}
                                                    onChange={(e) =>
                                                        handleInputChange("teacher", e.target.value)
                                                    }
                                                    className="w-full p-2 border rounded bg-background text-foreground border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="">Select teacher</option>
                                                    {teacherOptions.map((teacher) => (
                                                        <option key={teacher.id} value={teacher.id}>
                                                            {teacher.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Lecture</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    type="number"
                                                    placeholder="Enter Lecture Periods"
                                                    value={subject.lecture_time}
                                                    onChange={(e) =>
                                                        handleInputChange("lecture_time", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Theory</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    type="number"
                                                    placeholder="Enter Theory Periods"
                                                    value={subject.theory_time}
                                                    onChange={(e) =>
                                                        handleInputChange("theory_time", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Practical</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    type="number"
                                                    placeholder="Enter Practical Periods"
                                                    value={subject.practical_time}
                                                    onChange={(e) =>
                                                        handleInputChange("practical_time", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Credit</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    type="number"
                                                    placeholder="Enter credit"
                                                    value={subject.credit}
                                                    onChange={(e) =>
                                                        handleInputChange("credit", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Subject Code</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    placeholder="Enter subject code"
                                                    value={subject.code}
                                                    onChange={(e) =>
                                                        handleInputChange("code", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label>Subject Notation</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    placeholder="Enter Subject Notation"
                                                    value={subject.notation}
                                                    onChange={(e) =>
                                                        handleInputChange("notation", e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <Label>Upload File</Label>
                                                <Input
                                                    className="w-full p-2 border-2 rounded shadow-md"
                                                    type="file"
                                                    onChange={(e) =>
                                                        handleInputChange("file", e.target.files[0])
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <Button onClick={handleSubmit}>Submit Subject</Button>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}

                {subjectList.length > 0 && (
                    <div className="mt-6 border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Credit</TableHead>
                                    <TableHead>Lecture</TableHead>
                                    <TableHead>Theory</TableHead>
                                    <TableHead>Practical</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjectList.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell>{subject.name}</TableCell>
                                        <TableCell>{subject.type}</TableCell>
                                        <TableCell>{subject.teacher}</TableCell>
                                        <TableCell>{subject.code}</TableCell>
                                        <TableCell>{subject.credit}</TableCell>
                                        <TableCell>{subject.lecture_time}</TableCell>
                                        <TableCell>{subject.theory_time}</TableCell>
                                        <TableCell>{subject.practical_time}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="secondary"
                                                onClick={() => alert(`Viewing ${subject.name}`)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleDownload(subject)}
                                            >
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                    </div>
                )}
            </div>
        </div>
    );
}
