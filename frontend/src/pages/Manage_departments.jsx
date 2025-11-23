import DepartmentCard from "@/components/department_card.jsx";
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {useState} from "react";
import {Check, ChevronsUpDown} from "lucide-react"

import {cn} from "@/lib/utils"
import {ScrollArea} from "@/components/ui/scroll-area.jsx";

export default function ManageDepartments() {
    const departments = [
        {id: 1, name: "Mechanical",description: "Mechanical 4 year course with 8 semester",hod:"Sherin Sam"}

    ];
    const frameworks = [
        {
            value: "next.js",
            label: "Next.js",
        },
        {
            value: "sveltekit",
            label: "SvelteKit",
        },
        {
            value: "nuxt.js",
            label: "Nuxt.js",
        },
        {
            value: "remix",
            label: "Remix",
        },
        {
            value: "astro",
            label: "Astro",
        },
    ]
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")
    const [department_name, setDepartmentName] = useState("")
    const [semester, setSemester] = useState()
    return (
        <div className="flex flex-col h-full w-full overflow-auto">
            <h2 className="font-bold text-primary text-2xl mb-3">Departments</h2>
            <ScrollArea className="flex flex-col h-[80vh] w-full border-2 border-muted/90 rounded-lg p-4 overflow-auto">

                <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {departments.map((dept) => (
                        <DepartmentCard key={dept.id} department={dept}/>
                    ))}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                className="flex items-center h-[260px] w-[260px] rounded-3xl justify-center border-2 border-dashed border-gray-400  p-6 cursor-pointer hover:border-gray-600"
                                variant="outline"> <span className="text-gray-500 font-semibold">+ Add Department</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Add Department</SheetTitle>
                                <SheetDescription>
                                    Lets Go....
                                </SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Department Name
                                    </Label>
                                    <Input id="name" placeholder="Infermation Technology" value={department_name}
                                           className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center  gap-4">
                                    <Label htmlFor="username" className="text-right">
                                        HOD
                                    </Label>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className="w-[250px] justify-between"
                                            >
                                                {value
                                                    ? frameworks.find((framework) => framework.value === value)?.label
                                                    : "Select framework..."}
                                                <ChevronsUpDown className="opacity-50"/>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[250px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search framework..." className="h-9"/>
                                                <CommandList>
                                                    <CommandEmpty>No framework found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {frameworks.map((framework) => (
                                                            <CommandItem
                                                                key={framework.value}
                                                                value={framework.value}
                                                                onSelect={(currentValue) => {
                                                                    setValue(currentValue === value ? "" : currentValue)
                                                                    setOpen(false)
                                                                }}
                                                            >
                                                                {framework.label}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        value === framework.value ? "opacity-100" : "opacity-0"
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
                                    <Input type="number" id="semester" placeholder="0" value={semester}
                                           className="col-span-3"/>
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
    );
}
