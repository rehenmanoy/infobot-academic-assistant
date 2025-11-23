import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import logo from "../assets/images/logo.png";

import {
    BookOpen,
    Users,
    Frame,
    PictureInPicture2,
    TableIcon,
    Sparkles,
    Settings2,
    SquareTerminal,
    Logs
} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area.jsx";
const iconMap = {
    "BookOpen": BookOpen,
    "Users": Users,
    "Frame": Frame,
    "PictureInPicture2": PictureInPicture2,
    "TableIcon": TableIcon,
    "SettingsIcon": Settings2,
    "Sparkles":Sparkles,
    "SquareTerminal": SquareTerminal,
    "Logs": Logs
};

export function AppSidebar() {
    const isCollapsed = useSelector((state) => state.sidebar.isCollapsed);
    const [navigationData, setNavigationData] = useState(null);

    useEffect(() => {
        async function fetchNavigation() {
            try {
                const storedData = localStorage.getItem("permissions");

                if (storedData) {
                    try {
                        const navigation = JSON.parse(storedData);

                        if (navigation && typeof navigation === "object" && navigation.navMain) {
                            setNavigationData(navigation);
                        } else {
                            console.error("Invalid navigation data format: Missing 'navMain'");
                            setNavigationData(null);
                        }
                    } catch (jsonError) {
                        console.error("Error parsing navigation JSON:", jsonError);
                        setNavigationData(null);
                    }
                } else {
                    console.warn("No navigation data found in localStorage");
                    setNavigationData(null);
                }
            } catch (error) {
                console.error("Unexpected error fetching navigation:", error);
                setNavigationData(null);
            }
        }

        fetchNavigation();
    }, []);



    return (
        <Sidebar collapsible="icon">
            <div className="w-full h-[80px] flex flex-col">
                <div className="flex flex-row items-center gap-4 p-2">
                    <img className="w-[30px] h-[30px] rounded-[50%]" src={logo} alt="logo" />
                    {!isCollapsed && (
                        <a className="hidden md:block font-bold" href="/dashboard">
                            AJCE
                        </a>
                    )}
                </div>
                <Separator />
                <span className="flex justify-start text-primary p-2 font-bold">
                    {!isCollapsed && <span className="hidden md:block">InfoBot V1.0.0</span>}
                </span>
                <Separator />
            </div>
            <SidebarHeader />
            <SidebarContent>
                <ScrollArea className="w-full h-[700px]">

                    {navigationData?.navMain && (
                        <NavMain
                            items={navigationData.navMain.map((item) => ({
                                ...item,
                                icon: iconMap[item.icon] || null, // Assign icon dynamically
                            }))}
                        />
                    )}
                </ScrollArea>

            </SidebarContent>
            <SidebarFooter>
                <NavUser user={navigationData?.others?.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
