import {Button} from "@/components/ui/button.jsx";
import {Separator} from "@/components/ui/separator.jsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {TableIcon, User2Icon} from "lucide-react";

export default function DepartmentCard({department}) {

    return (
        <div
            className="flex flex-col bg-secondary-background rounded-3xl h-[260px] w-[260px] shadow-md border  p-3 justify-between">
            <div>
                <h2 className="text-lg font-medium tracking-tighter text-secondary-foreground lg:text-2xl">
                    {department.name}
                </h2>
                <p className="mt-2 text-sm text-secondary-foreground">
                    Department: &nbsp; {department.description || "No description available"}
                </p>
                <p className="mt-2 text-sm text-secondary-foreground">
                    HOD: &nbsp; {department.hod || "No HOD assigned"}
                </p>
            </div>


            <Separator className="my-4"/>

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <div className="cursor-pointer hover:underline text-secondary-foreground"><Dialog>
                    <DialogTrigger className="hover:scale-105 flex flex-row"><User2Icon/> &nbsp; Faculty</DialogTrigger>
                    <DialogContent className="w-full min-w-[80vw] h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>Faculty Details</DialogTitle>
                            <DialogDescription>

                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog></div>
                <Separator orientation="vertical"/>
                <div className="cursor-pointer hover:underline text-secondary-foreground "><Dialog>
                    <DialogTrigger className="hover:scale-105 flex flex-row"><TableIcon/>&nbsp;Semester</DialogTrigger>
                    <DialogContent className="w-full min-w-[80vw] h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>Semester</DialogTitle>
                            <DialogDescription>

                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog></div>
            </div>
        </div>
    );
}
