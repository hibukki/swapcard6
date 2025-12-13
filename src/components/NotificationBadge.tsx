import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  conferenceId?: string;
}

export function NotificationBadge({ conferenceId }: NotificationBadgeProps) {
  const unreadCount = useQuery(api.notifications.countUnread);

  const badge = (
    <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
      <Bell className="w-5 h-5" />
      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex items-center justify-center",
            "min-w-[18px] h-[18px] px-1 rounded-full",
            "bg-destructive text-destructive-foreground text-xs font-medium"
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  if (!conferenceId) {
    return badge;
  }

  return (
    <Link
      to="/conference/$conferenceId/notifications"
      params={{ conferenceId }}
    >
      {badge}
    </Link>
  );
}
