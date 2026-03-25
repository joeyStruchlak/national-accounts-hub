import {
  LayoutDashboard,
  FileCheck,
  Kanban,
  BarChart3,
  DollarSign,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "BAS Review", url: "/bas-review", icon: FileCheck },
  { title: "Job Pipeline", url: "/job-pipeline", icon: Kanban },
  { title: "Productivity", url: "/productivity", icon: BarChart3 },
  { title: "Payroll Rec", url: "/payroll-rec", icon: DollarSign },
  { title: "Super Rec", url: "/super-rec", icon: ShieldCheck },
  { title: "Client Records", url: "/clients", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-primary-foreground tracking-wide">
              National Accounts
            </span>
            <span className="text-[10px] font-medium text-sidebar-primary tracking-widest uppercase">
              Internal Portal
            </span>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-sidebar-primary">NA</span>
        )}
      </div>

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
