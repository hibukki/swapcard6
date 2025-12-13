import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { Mail, MailOpen } from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { UserName } from "@/components/patterns/UserName";
import { MeetingName } from "@/components/patterns/MeetingName";
import { ShortDate } from "@/components/patterns/ShortDate";
import { cn } from "@/lib/utils";
import { handleMutationError } from "@/lib/error-handling";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type NotificationType = Doc<"notifications">["type"];

function getNotificationVerb(type: NotificationType): string {
  switch (type) {
    case "meeting_request":
      return "invited you to";
    case "meeting_accepted":
      return "accepted";
    case "meeting_declined":
      return "declined";
    case "meeting_cancelled":
      return "cancelled";
    default:
      return "updated";
  }
}

function NotificationsPage() {
  const notifications = useQuery(api.notifications.list, {});
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAsUnread = useMutation(api.notifications.markAsUnread);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const allUsers = useQuery(api.users.listUsers, {});

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  const handleToggleRead = async (notification: Doc<"notifications">) => {
    try {
      if (notification.isRead) {
        await markAsUnread({ notificationId: notification._id });
      } else {
        await markAsRead({ notificationId: notification._id });
      }
    } catch (error) {
      handleMutationError(error, "Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead({});
    } catch (error) {
      handleMutationError(error, "Failed to mark all as read");
    }
  };

  const hasUnread = notifications?.some((n) => !n.isRead);

  if (!notifications) {
    return <div className="not-prose">Loading...</div>;
  }

  return (
    <div className="not-prose max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleMarkAllRead()}
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState description="No notifications yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              user={
                notification.relatedUserId
                  ? usersMap.get(notification.relatedUserId)
                  : undefined
              }
              onToggleRead={() => void handleToggleRead(notification)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  user,
  onToggleRead,
}: {
  notification: Doc<"notifications">;
  user?: Doc<"users">;
  onToggleRead: () => void;
}) {
  const meeting = useQuery(
    api.meetings.get,
    notification.relatedMeetingId
      ? { meetingId: notification.relatedMeetingId }
      : "skip"
  );

  const verb = getNotificationVerb(notification.type);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        notification.isRead ? "bg-background" : "bg-muted/50"
      )}
    >
      <div className="flex-1 min-w-0 text-sm">
        {user ? <UserName user={user} /> : <span>Someone</span>}
        <span className="text-muted-foreground"> {verb} </span>
        {meeting ? (
          <MeetingName meeting={meeting} />
        ) : (
          <span className="text-muted-foreground">a meeting</span>
        )}
        <span className="text-muted-foreground text-xs ml-2">
          <ShortDate timestamp={notification._creationTime} />
        </span>
      </div>

      <Tippy content={notification.isRead ? "Mark as unread" : "Mark as read"}>
        <Button variant="ghost" size="icon" onClick={onToggleRead}>
          {notification.isRead ? (
            <MailOpen className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
        </Button>
      </Tippy>
    </div>
  );
}
