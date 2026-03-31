import { Bell, ChevronDown, LogOut, User, Settings, Shield } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export function TopNav() {
  const [showProfile, setShowProfile] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User");
        setUserAvatar(session.user.user_metadata?.avatar_url || "");
      }
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4 shadow-sm z-20 relative">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
        <div className="hidden sm:block h-4 w-px bg-border" />
        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">National Accounts</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Xero connected badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#89ead3]/40 bg-[#89ead3]/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#89ead3] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#2a3a5a]">Xero Connected</span>
        </div>

        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 hover:bg-muted transition-colors"
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-[#2a3a5a] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{initials}</span>
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-[12px] font-semibold text-primary leading-tight">{userName}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{userEmail}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showProfile ? "rotate-180" : ""}`} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-white shadow-xl z-50 overflow-hidden">
              {/* Profile header */}
              <div className="bg-[#2a3a5a] px-4 py-4">
                <div className="flex items-center gap-3">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="h-10 w-10 rounded-full object-cover border-2 border-[#89ead3]/40" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[#89ead3]/20 border-2 border-[#89ead3]/40 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#89ead3]">{initials}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">{userName}</p>
                    <p className="text-[11px] text-white/60">{userEmail}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#89ead3]" />
                      <span className="text-[10px] text-[#89ead3] font-medium">Active session</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-medium text-primary">Profile</p>
                    <p className="text-[11px] text-muted-foreground">Manage your account</p>
                  </div>
                </button>

                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-medium text-primary">Security</p>
                    <p className="text-[11px] text-muted-foreground">Google SSO · 2FA enabled</p>
                  </div>
                </button>

                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-medium text-primary">Settings</p>
                    <p className="text-[11px] text-muted-foreground">Portal preferences</p>
                  </div>
                </button>
              </div>

              <div className="border-t border-border p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-[13px] font-medium text-red-600">Sign Out</p>
                    <p className="text-[11px] text-muted-foreground">End your session</p>
                  </div>
                </button>
              </div>

              {/* Security footer */}
              <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center gap-2">
                <Shield className="h-3 w-3 text-[#89ead3]" />
                <p className="text-[10px] text-muted-foreground">Secured by Google OAuth 2.0 · Australian hosting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}