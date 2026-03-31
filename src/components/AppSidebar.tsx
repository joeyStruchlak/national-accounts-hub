import {
  LayoutDashboard,
  Kanban,
  BarChart3,
  Users,
  Zap,
  LogOut,
  ChevronRight,
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Job Pipeline", url: "/job-pipeline", icon: Kanban },
  { title: "Productivity", url: "/productivity", icon: BarChart3 },
  { title: "Client Records", url: "/clients", icon: Users },
  {
    title: "AI Automation",
    url: "/automation",
    icon: Zap,
    hasNotification: true,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden bg-white">
      {/* Watermark logo - sits behind everything */}
      {!collapsed && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <img
            src={logoSrc}
            alt=""
            style={{
              width: "260px",
              opacity: 0.12,
              transform: "rotate(-8deg) scale(1.4)",
              filter: "grayscale(100%) brightness(0.3)",
            }}
          />
        </div>
      )}

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
            <img
              src={logoSrc}
              alt="NA"
              className="h-full w-full object-contain"
            />
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

      {/* Content - transparent background so watermark shows through */}
      <SidebarContent
        className="relative z-10 flex flex-col justify-between h-full pt-4"
        style={{ background: "#ffffff" }}
      >
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
              {navItems.map((item) => {
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
                          {"hasNotification" in item &&
                            item.hasNotification &&
                            !active && (
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
                            {!active &&
                              "hasNotification" in item &&
                              item.hasNotification && (
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom section */}
        <SidebarGroup className="mt-auto px-3 mb-4 bg-white">
          {!collapsed && (
            <div
              className="absolute pointer-events-none overflow-hidden z-0"
              style={{
                bottom: "120px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              aria-hidden="true"
            >
              <img
                src={logoSrc}
                alt=""
                style={{
                  width: "1420px",
                  opacity: 0.18,
                }}
              />
            </div>
          )}
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
