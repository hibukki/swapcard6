import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Bell } from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export function NotificationsBell() {
  const unreadCount = useQuery(api.notifications.countUnread);

  return (
    <Tippy content="Notifications" delay={[200, 0]}>
      <Link to="/notifications">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </Link>
    </Tippy>
  );
}
