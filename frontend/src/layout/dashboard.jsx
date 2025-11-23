import { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sun, Moon, RefreshCcw,Settings } from "lucide-react";
import user_theme_preference from "@/api/user_preference/set_preference.jsx";
import { useToast } from "@/hooks/use-toast.jsx"
import get_user_theme_preference from "@/api/user_preference/get_preference.jsx";

// eslint-disable-next-line react/prop-types
export default function DashboardIndex({children}) {

    useEffect(() => {
        const fetchThemePreference = async () => {
            try {
                const pref = await get_user_theme_preference();
                if (String(pref.theme).toLowerCase() === "dark") {
                    localStorage.setItem("dark_theme", "true");
                } else {
                    localStorage.setItem("dark_theme", "false");
                }
                if (pref.color) {
                    localStorage.setItem("color", pref.color);
                } else {
                    localStorage.removeItem("color");
                }
            } catch (error) {
                console.error("Error fetching theme preference:", error);
            }
        };

        fetchThemePreference();
    }, []);

    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("dark_theme") === 'true');
    const [color, setColor] = useState(() => localStorage.getItem("color") || 'defaultColor');
    const toggleItems = [
        { value: "zinc", color: "bg-zinc-600", label: "Zinc" },
        { value: "red", color: "bg-red-700", label: "Red" },
        { value: "rose", color: "bg-rose-600", label: "Rose" },
        { value: "orange", color: "bg-orange-600", label: "Orange" },
        { value: "green", color: "bg-green-600", label: "Green" },
        { value: "blue", color: "bg-blue-600", label: "Blue" },
        { value: "yellow", color: "bg-yellow-600", label: "Yellow" },
        { value: "violet", color: "bg-violet-600", label: "Violet" },
    ];
    const { toast } = useToast()
    useEffect(() => {
        const newThemeColor = `${isDarkMode ? 'dark' : 'light'}_${color}`;

        const root = document.documentElement;
        root.classList.forEach(className => {
            if (className.startsWith('light_') || className.startsWith('dark_')) {
                root.classList.remove(className);
            }
        });
        root.classList.add(newThemeColor);
    }, [isDarkMode, color]);

    const reloadConfig = () =>{
        localStorage.setItem("dark_theme", false);
        localStorage.setItem("color", "green");
        window.location.reload();
    }

    const handleColorChange = (newValue) => {
        setColor(newValue);
    };

    const saveTheme = async () => {
        localStorage.setItem("dark_theme", isDarkMode.toString());
        localStorage.setItem("color", color);

        const themeMode = isDarkMode ? "dark" : "light";

        try {
            const response = await user_theme_preference(themeMode, color);
            console.log(response.status);
            if (response && response.status === "success") {
                toast({
                    title: "Theme successfully updated!",
                    description: "Your theme preference has been saved.",
                    status: "success",
                });

                setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                console.error("Unexpected response while saving theme:", response);
                toast({
                    title: "Failed to update theme",
                    description: "There was an issue saving your theme preferences to the database. Your local preferences have been updated.",
                    status: "error",
                });
            }
        } catch (error) {
            console.error("Error saving theme preference:", error);

            toast({
                title: "Error saving theme preference",
                description: "We encountered a problem while updating your preferences. Please try again later.",
                status: "error",
            });
        }
    };




    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="p-1">
                <header className="flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />

                    </div>
                    <Popover>
                        <PopoverTrigger className="w-[30px] h-[30px]  hover:bg-primary hover:text-white bg-muted text-muted-foreground border border-border flex justify-center items-center rounded-full">
                            <Settings className="w-full h-full"/>
                        </PopoverTrigger>
                        <PopoverContent className="flex flex-col gap-4 w-[330px]">
                            <div className="flex flex-row justify-between">
                                <span className="font-bold">Theme Customizer</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span onClick={reloadConfig}>
                                                <RefreshCcw className="hover:bg-gray-500 hover:text-white hover:cursor-pointer p-1 rounded-[50%]" />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <span>Refresh</span>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Separator />
                            <div className="flex flex-col gap-1">
                                <span>Color</span>
                                <Separator />
                            </div>
                            <ToggleGroup type="single" value = {color} className="grid grid-cols-3 gap-2" onValueChange={handleColorChange}>
                                {toggleItems.map((item) => (
                                    <ToggleGroupItem
                                        key={item.value}
                                        value={item.value}
                                        onClick={() => setColor(item.value)}
                                        className={`data-[state=on]:border-primary data-[state=on]:bg-transparent 
                                    data-[state=off]:border-muted data-[state=off]:text-muted-foreground 
                                    border-2 rounded-md flex flex-row justify-start items-center gap-2 
                                    p-2 bg-transparent`}
                                    >
                                        <div className={`w-[20px] h-[20px] rounded-[50%] ${item.color}`}></div>
                                        <span>{item.label}</span>
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <div className="flex flex-col gap-1">
                                <span>Mode</span>
                                <Separator />
                            </div>
                            <div className="flex items-center justify-center">
                                <ToggleGroup
                                    type="single"
                                    value={isDarkMode ? "dark" : "light"}
                                    onValueChange={(value) => setIsDarkMode(value === "dark")}
                                    className="flex gap-4"
                                >
                                    <ToggleGroupItem value="dark" className="data-[state=on]:border-primary data-[state=on]:bg-transparent
                                    data-[state=off]:border-muted data-[state=off]:text-muted-foreground
                                    border-2 rounded-md flex flex-row justify-start items-center gap-2
                                    p-2 bg-transparent">
                                        <Moon size={18} />
                                        <span>Dark Mode</span>
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="light" className="data-[state=on]:border-primary data-[state=on]:bg-transparent
                                    data-[state=off]:border-muted data-[state=off]:text-muted-foreground
                                    border-2 rounded-md flex flex-row justify-start items-center gap-2
                                    p-2 bg-transparent">
                                        <Sun size={18} />
                                        <span>Light Mode</span>
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <Separator />
                            <div className="flex flex-row justify-between gap-1">
                                <span>Save your preference:</span>
                                <Button
                                    onClick={saveTheme}
                                >Save
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </header>
                <div className="flex flex-1 flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
