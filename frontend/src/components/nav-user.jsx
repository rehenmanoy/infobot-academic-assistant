import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/auth/AuthContext.jsx";
import { ROLE_LABELS } from "@/lib/navigation.js";

function initials(user) {
    return `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

function UserSummary({ user }) {
    return (
        <>
            <Avatar className="h-8 w-8 rounded-lg">
                {user?.photo && <AvatarImage src={user.photo} alt="" />}
                <AvatarFallback className="rounded-lg">{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user?.full_name}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user?.role]}</span>
            </div>
        </>
    );
}

export function NavUser() {
    const { isMobile } = useSidebar();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Clearing the user makes the protected route redirect to the login page.
    const handleLogout = () => logout();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <UserSummary user={user} />
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-auto min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5">
                                <UserSummary user={user} />
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
                            <Settings className="mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                            <LogOut className="mr-2" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
