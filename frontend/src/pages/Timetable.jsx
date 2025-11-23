/*
 Created on 23-03-2025
 Project: frontend
 Author: Donis Abraham
*/

import {ScrollArea} from "@/components/ui/scroll-area.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Label} from "@/components/ui/label.jsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.jsx";
import {Check, ChevronsUpDown, Loader2} from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command.jsx";
import {cn} from "@/lib/utils.js";
import {useState} from "react";
import axios from "axios";
import {API_BASE_URL} from "@/configs/config.jsx";
import ReactMarkdown from "react-markdown"; // 🔥 Markdown renderer

export default function Timetable() {
    const [semOpen, setSemOpen] = useState(false);
    const [semValue, setSemValue] = useState("");
    const [markdownData, setMarkdownData] = useState("")
    const [loading, setLoading] = useState(false);

    const semester = [
        { value: "odd", label: "Odd Semester" },
        { value: "even", label: "Even Semester" },
    ];

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const response = await axios.post(API_BASE_URL + "/api/timetable", {
                semester: semValue
            });

            if (response.data.status_code === 200) {
                setMarkdownData(response.data.data.response);
            }
        } catch (error) {
            console.error("Error generating timetable:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full w-full overflow-auto">
            <h2 className="font-bold text-primary text-2xl mb-3">Build Time-Tables</h2>
            <div className="w-full flex flex-col gap-2">
                <div className="w-full flex flex-row gap-10">
                    <div className="flex flex-row items-center gap-4 mb-4">
                        <Label className="text-right">Semester</Label>
                        <Popover open={semOpen} onOpenChange={setSemOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={semOpen}
                                    className="w-[250px] justify-between"
                                >
                                    {semValue
                                        ? semester.find((item) => item.value === semValue)?.label
                                        : "Select Semester..."}
                                    <ChevronsUpDown className="opacity-50"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search Semester..."/>
                                    <CommandList>
                                        <CommandEmpty>No result found.</CommandEmpty>
                                        <CommandGroup>
                                            {semester.map((item) => (
                                                <CommandItem
                                                    key={item.value}
                                                    value={item.value}
                                                    onSelect={(currentValue) => {
                                                        setSemValue(currentValue);
                                                        setSemOpen(false);
                                                    }}
                                                >
                                                    {item.label}
                                                    <Check
                                                        className={cn(
                                                            "ml-auto h-4 w-4",
                                                            semValue === item.value ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex flex-row-reverse items-center gap-4 w-full">
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <Loader2 className="animate-spin w-4 h-4 mr-2"/>
                            ) : null}
                            {loading ? "Generating..." : "Process"}
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex flex-col h-[70vh] w-full border-2 border-muted/90 rounded-lg p-4 overflow-auto">
                    <div className="prose prose-sm max-w-full">
                        <ReactMarkdown>
                            {(typeof markdownData === "string" && markdownData.trim().length > 0)
                                ? markdownData
                                : "*No timetable generated yet.*"}
                        </ReactMarkdown>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

