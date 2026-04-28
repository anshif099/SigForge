import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FileCode2, Users, Wand2, Settings, LogIn } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logoUrl from "../images/logo.png?url";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Templates", url: "/templates", icon: FileCode2 },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Generate", url: "/generate", icon: Wand2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Account", url: "/auth", icon: LogIn },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <img
            src={logoUrl}
            alt="SigForge logo"
            className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-1 shadow-sm"
          />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">SigForge</span>
            <span className="text-[10px] text-muted-foreground">Signatures at scale</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
