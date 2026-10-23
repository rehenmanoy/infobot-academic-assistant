import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/auth/AuthContext.jsx";
import { navigationFor } from "@/lib/navigation.js";
import logo from "../assets/images/logo.png";

export function AppSidebar() {
    const { user } = useAuth();
    const { state } = useSidebar();
    const collapsed = state === "collapsed";

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex flex-row items-center gap-3 p-1">
                    <img className="w-8 h-8 rounded-full shrink-0" src={logo} alt="InfoBot logo" />
                    {!collapsed && (
                        <div className="flex flex-col leading-tight">
                            <span className="font-bold">InfoBot</span>
                            <span className="text-xs text-muted-foreground">Academic Assistant</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>
            <Separator />
            <SidebarContent>
                <NavMain items={navigationFor(user?.role)} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
