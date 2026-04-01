import {
  LayoutDashboard,
  Kanban,
  BarChart3,
  Users,
  Zap,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo.png";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Job Pipeline", url: "/job-pipeline", icon: Kanban },
  { title: "Productivity", url: "/productivity", icon: BarChart3 },
  { title: "Client Records", url: "/clients", icon: Users },
];

const complianceNavItems = [
  { title: "BAS Review", url: "/bas-review", icon: ShieldCheck },
  { title: "GST Reconciliation", url: "/gst-reconciliation", icon: FileText },
  { title: "Lodgment Tracker", url: "/lodgments", icon: ClipboardList },
  { title: "Billing Automation", url: "/billing", icon: Receipt },
];

const automationNavItems = [
  {
    title: "AI Automation",
    url: "/automation",
    icon: Zap,
    hasNotification: true,
  },
];

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  hasNotification?: boolean;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const renderNavItem = (item: NavItem) => {
    const active = location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className="h-auto p-0"
        >
          <NavLink
            to={item.url}
            end
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 relative group",
              active
                ? "bg-[#2a3a5a] text-white shadow-md"
                : "text-gray-500 hover:text-[#2a3a5a] hover:bg-white/70"
            )}
            activeClassName=""
          >
            <div className="relative shrink-0">
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-[#89ead3]"
                    : "text-gray-400 group-hover:text-[#2a3a5a]"
                )}
              />
              {item.hasNotification && !active && (
                <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#f9b33f]" />
              )}
            </div>

            {!collapsed && (
              <>
                <span
                  className={cn(
                    "text-[13px] font-semibold flex-1",
                    active
                      ? "text-white"
                      : "text-gray-600 group-hover:text-[#2a3a5a]"
                  )}
                >
                  {item.title}
                </span>
                {active && (
                  <ChevronRight className="h-3.5 w-3.5 text-[#89ead3] shrink-0" />
                )}
                {!active && item.hasNotification && (
                  <span className="text-[9px] font-bold bg-[#f9b33f] text-[#2a3a5a] px-1.5 py-0.5 rounded-full">
                    NEW
                  </span>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden bg-white">


      {/* Logo header */}
      <div
        className={cn(
          "relative flex items-center border-b border-gray-100 z-10",
          collapsed ? "h-16 justify-center px-3" : "h-20 px-5 gap-3"
        )}
        style={{ background: "#ffffff" }}
      >
        {collapsed ? (
          <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center">
            <img src={logoSrc} alt="NA" className="h-full w-full object-contain" />
          </div>
        ) : (
          <>
            <img
              src={logoSrc}
              alt="National Accounts"
              className="h-10 object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0 border-l border-gray-200 pl-3">
              <span className="text-[#2a3a5a] font-bold text-[13px] leading-tight tracking-wide">
                Internal Portal
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#89ead3] animate-pulse" />
                <span className="text-[10px] font-semibold text-[#89ead3] tracking-wide">
                  AI Powered
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <SidebarContent
        className="relative z-10 flex flex-col justify-between h-full pt-4"
        style={{ background: "#ffffff" }}
      >
        {/* Main nav */}
        {!collapsed && (
          <div className="px-5 mb-2">
            <span className="text-[10px] font-bold text-gray-300 tracking-[0.2em] uppercase">
              Menu
            </span>
          </div>
        )}
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Compliance section */}
        {!collapsed && (
          <div className="px-5 mt-4 mb-2">
            <span className="text-[10px] font-bold text-gray-300 tracking-[0.2em] uppercase">
              Compliance
            </span>
          </div>
        )}
        {collapsed && <div className="mt-2" />}
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {complianceNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Automation section */}
        {!collapsed && (
          <div className="px-5 mt-4 mb-2">
            <span className="text-[10px] font-bold text-gray-300 tracking-[0.2em] uppercase">
              Automation
            </span>
          </div>
        )}
        {collapsed && <div className="mt-2" />}
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {automationNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom sign out */}
        <SidebarGroup className="mt-auto px-3 mb-4 bg-white">
          
          <div className="border-t border-gray-200 mb-3 mx-1" />
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign Out"
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all duration-150 w-full h-auto"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="text-[13px] font-semibold">Sign Out</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}