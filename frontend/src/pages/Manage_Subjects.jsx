import {ScrollArea} from "@/components/ui/scroll-area.jsx";
import {
    Sheet, SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Label} from "@/components/ui/label.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.jsx";
import {Check, ChevronsUpDown} from "lucide-react";
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

export default function manage_Subjects() {
    const [departmentName, setDepartmentName] = useState("");
    const [hodOpen, setHodOpen] = useState(false);
    const [hodValue, setHodValue] = useState("");
    const [semOpen, setSemOpen] = useState(false);
    const [semValue, setSemValue] = useState("");
    const [semesterInput, setSemesterInput] = useState(0);

    const courses = [
        {value: "next.js", label: "Next.js"},
        {value: "sveltekit", label: "SvelteKit"},
        {value: "nuxt.js", label: "Nuxt.js"},
        {value: "remix", label: "Remix"},
        {value: "astro", label: "Astro"},
    ];

    return (
        <div className="flex flex-col h-full w-full overflow-auto">
            <h2 className="font-bold text-primary text-2xl mb-3">Subjects</h2>
            <div className="w-full flex flex-col gap-2">
                <div className="w-full flex flex-row gap-2">
                    <div className="flex flex-row items-center gap-4">
                        <Label className="text-right">Department</Label>
                        <Popover open={hodOpen} onOpenChange={setHodOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={hodOpen}
                                    className="w-[250px] justify-between"
                                >
                                    {hodValue
                                        ? courses.find((item) => item.value === hodValue)?.label
                                        : "Select HOD..."}
                                    <ChevronsUpDown className="opacity-50"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search HOD..."/>
                                    <CommandList>
                                        <CommandEmpty>No result found.</CommandEmpty>
                                        <CommandGroup>
                                            {courses.map((item) => (
                                                <CommandItem
                                                    key={item.value}
                                                    value={item.value}
                                                    onSelect={(currentValue) => {
                                                        setHodValue(currentValue);
                                                        setHodOpen(false);
                                                    }}
                                                >
                                                    {item.label}
                                                    <Check
                                                        className={cn(
                                                            "ml-auto h-4 w-4",
                                                            hodValue === item.value ? "opacity-100" : "opacity-0"
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

                    <div className="flex flex-row items-center gap-4">
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
                                        ? courses.find((item) => item.value === semValue)?.label
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
                                            {courses.map((item) => (
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
                </div>

                <ScrollArea
                    className="flex flex-col h-[80vh] w-full border-2 border-muted/90 rounded-lg p-4 overflow-auto">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    className="flex items-center h-[160px] w-[160px] rounded-3xl justify-center border-2 border-dashed border-gray-400 p-6 cursor-pointer hover:border-gray-600"
                                    variant="outline"
                                >
                                    <span className="text-gray-500 font-semibold">+ Add Documents</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Add Department</SheetTitle>
                                    <SheetDescription>Let's Go...</SheetDescription>
                                </SheetHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            Department Name
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="Information Technology"
                                            value={departmentName}
                                            onChange={(e) => setDepartmentName(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">HOD</Label>
                                        <Popover open={hodOpen} onOpenChange={setHodOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={hodOpen}
                                                    className="w-[250px] justify-between"
                                                >
                                                    {hodValue
                                                        ? courses.find((item) => item.value === hodValue)?.label
                                                        : "Select HOD..."}
                                                    <ChevronsUpDown className="opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[250px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search HOD..."/>
                                                    <CommandList>
                                                        <CommandEmpty>No result found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {courses.map((item) => (
                                                                <CommandItem
                                                                    key={item.value}
                                                                    value={item.value}
                                                                    onSelect={(currentValue) => {
                                                                        setHodValue(currentValue);
                                                                        setHodOpen(false);
                                                                    }}
                                                                >
                                                                    {item.label}
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            hodValue === item.value ? "opacity-100" : "opacity-0"
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
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="semester" className="text-right">
                                            Semester
                                        </Label>
                                        <Input
                                            type="number"
                                            id="semester"
                                            placeholder="0"
                                            value={semesterInput}
                                            onChange={(e) => setSemesterInput(Number(e.target.value))}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <SheetFooter>
                                    <SheetClose asChild>
                                        <Button type="submit">Save changes</Button>
                                    </SheetClose>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
