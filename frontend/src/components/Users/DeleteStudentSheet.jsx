import axios from "axios";
import { useState } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {API_BASE_URL} from "@/configs/config.jsx";

// 👇 Accepts studentId as prop (and optional callback)
export default function DeleteStudentDialog({ studentId, onDeleted }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await axios.delete(API_BASE_URL+`/api/students/${studentId}`);
            toast({
                title: "Student Deleted",
                description: "The student was successfully removed.",
            });

            // Optional refresh or callback after delete
            if (onDeleted) {
                onDeleted();
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast({
                title: "Deletion Failed",
                description: "An error occurred while deleting the student.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outlined"
                    className="text-primary border-2 border-primary bg-transparent hover:scale-105 hover:text-primary font-bold"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </Button>
            </DialogTrigger>

            <DialogContent className="bg-background text-foreground">
                <DialogHeader>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the user and remove all related data.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="flex justify-end space-x-2 mt-4">
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={isLoading}>
                            Cancel
                        </Button>
                    </DialogTrigger>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                        >
                            {isLoading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogTrigger>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
