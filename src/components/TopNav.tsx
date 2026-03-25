import { Bell, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-premium">
      <SidebarTrigger className="text-primary hover:text-accent" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full gradient-navy flex items-center justify-center">
            <User className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
}
