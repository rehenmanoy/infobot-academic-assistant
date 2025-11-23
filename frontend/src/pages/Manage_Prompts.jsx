import {useEffect, useState} from "react";
import {Label} from "@/components/ui/label.jsx";
import {Separator} from "@/components/ui/separator.jsx";
import {Textarea} from "@/components/ui/textarea.jsx";
import {Button} from "@/components/ui/button.jsx";
import {API_BASE_URL} from "@/configs/config.jsx";

export default function Manage_Prompts() {
    const [prompts, setPrompts] = useState({
        syllabus: { id: null, text: "" },
        subjects: { id: null, text: "" },
        timetable: { id: null, text: "" }
    });

    const fetchPrompts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/prompts`);
            const data = await res.json();

            const mapped = {
                syllabus: { id: null, text: "" },
                subjects: { id: null, text: "" },
                timetable: { id: null, text: "" },
            };

            data.forEach(p => {
                if (p.prompt_name.toLowerCase() === "syllabus") {
                    mapped.syllabus = { id: p.id, text: p.prompt_text };
                } else if (p.prompt_name.toLowerCase() === "subjects") {
                    mapped.subjects = { id: p.id, text: p.prompt_text };
                } else if (p.prompt_name.toLowerCase() === "timetable") {
                    mapped.timetable = { id: p.id, text: p.prompt_text };
                }
            });

            setPrompts(mapped);
        } catch (err) {
            console.error("Failed to load prompts:", err);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    const handleSave = async (type) => {
        const prompt = prompts[type];
        const payload = {
            id: prompt.id || 0,
            prompt_name: type,
            prompt_text: prompt.text
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert(`${type} prompt saved`);
                fetchPrompts(); // reload updated
            } else {
                alert("Failed to save prompt");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (type, value) => {
        setPrompts(prev => ({
            ...prev,
            [type]: { ...prev[type], text: value }
        }));
    };

    return (
        <div className="w-full h-full bg-background rounded-lg p-2 flex flex-col">
            <h3 className="text-primary font-bold text-2xl">Manage Prompts</h3>
            <div className="flex flex-row w-full h-full p-5 gap-5">
                <div className="flex w-full h-full flex-col border-2 border-primary-background rounded-lg">
                    <div className="w-full h-full flex flex-col p-4 gap-3">
                        <Label className="text-primary">Syllabus Prompts</Label>
                        <Separator className="bg-primary"/>
                        <Textarea
                            className="w-full h-full"
                            value={prompts.syllabus.text}
                            onChange={(e) => handleChange("syllabus", e.target.value)}
                        />
                        <div className="w-full flex flex-row-reverse h-[60px]">
                            <Button onClick={() => handleSave("syllabus")}>Save</Button>
                        </div>
                    </div>
                    <div className="w-full h-full flex flex-col p-4 gap-3">
                        <Label className="text-primary">Subjects Prompts</Label>
                        <Separator className="bg-primary"/>
                        <Textarea
                            className="w-full h-full"
                            value={prompts.subjects.text}
                            onChange={(e) => handleChange("subjects", e.target.value)}
                        />
                        <div className="w-full flex flex-row-reverse h-[60px]">
                            <Button onClick={() => handleSave("subjects")}>Save</Button>
                        </div>
                    </div>
                </div>
                <div className="flex w-full h-full flex-col border-2 border-primary-background gap-3 rounded-lg p-3">
                    <Label className="text-primary">Time-Table Prompts</Label>
                    <Separator className="bg-primary"/>
                    <Textarea
                        className="w-full h-full"
                        value={prompts.timetable.text}
                        onChange={(e) => handleChange("timetable", e.target.value)}
                    />
                    <div className="w-full flex flex-row-reverse h-[60px]">
                        <Button onClick={() => handleSave("timetable")}>Save</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
