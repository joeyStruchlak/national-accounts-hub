import {
  LayoutDashboard,
  FileCheck,
  Kanban,
  BarChart3,
  DollarSign,
  ShieldCheck,
  Users,
  Zap,
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
import logoSrc from "@/assets/logo.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "BAS Review", url: "/bas-review", icon: FileCheck },
  { title: "Job Pipeline", url: "/job-pipeline", icon: Kanban },
  { title: "Productivity", url: "/productivity", icon: BarChart3 },
  { title: "Payroll Rec", url: "/payroll-rec", icon: DollarSign },
  { title: "Super Rec", url: "/super-rec", icon: ShieldCheck },
  { title: "Client Records", url: "/clients", icon: Users },
  { title: "AI Automation", url: "/automation", icon: Zap, hasNotification: true },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <img
          src={logoSrc}
          alt="National Accounts"
          className={collapsed ? "h-8 w-8 object-contain" : "h-10 w-10 object-contain"}
        />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-display text-[13px] font-semibold text-sidebar-primary-foreground tracking-wide leading-tight">
              National Accounts
            </span>
            <span className="text-[9px] font-semibold text-accent tracking-[0.2em] uppercase">
              Internal Portal
            </span>
          </div>
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
                        className={`transition-colors relative ${
                          active
                            ? "bg-sidebar-accent text-accent border-l-2 border-accent"
                            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                        activeClassName="bg-sidebar-accent text-accent"
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
