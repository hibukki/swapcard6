import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { Bell, CheckCircle, Circle, Trash2 } from "lucide-react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { UserName } from "@/components/patterns/UserName";
import { MeetingName } from "@/components/patterns/MeetingName";
import { handleMutationError } from "@/lib/error-handling";

const notificationsQuery = convexQuery(api.notifications.list, {});

export const Route = createFileRoute("/notifications")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(notificationsQuery);
    }
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notifications } = useSuspenseQuery(notificationsQuery);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({});
    } catch (error) {
      handleMutationError(error, "Failed to mark all as read");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notifications
          {unreadCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({unreadCount} unread)
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleMarkAllAsRead()}
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div className="not-prose">
        {notifications.length === 0 ? (
          <EmptyState description="No notifications yet" />
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification._id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
}: {
  notification: Doc<"notifications">;
}) {
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAsUnread = useMutation(api.notifications.markAsUnread);
  const remove = useMutation(api.notifications.remove);

  const relatedUser = useQuery(
    api.notifications.getUser,
    notification.relatedUserId ? { userId: notification.relatedUserId } : "skip"
  );
  const relatedMeeting = useQuery(
    api.notifications.getMeeting,
    notification.relatedMeetingId ? { meetingId: notification.relatedMeetingId } : "skip"
  );

  const handleToggleRead = async () => {
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

  const handleRemove = async () => {
    try {
      await remove({ notificationId: notification._id });
    } catch (error) {
      handleMutationError(error, "Failed to delete notification");
    }
  };

  return (
    <div
      className={`flex items-center gap-3 py-3 px-2 ${notification.isRead ? "opacity-60" : ""}`}
    >
      <Tippy
        content={notification.isRead ? "Mark as unread" : "Mark as read"}
        delay={[200, 0]}
      >
        <button
          onClick={() => void handleToggleRead()}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          {notification.isRead ? (
            <Circle className="w-5 h-5 text-muted-foreground" />
          ) : (
            <CheckCircle className="w-5 h-5 text-primary" />
          )}
        </button>
      </Tippy>

      <div className="flex-1 min-w-0">
        <NotificationContent
          notification={notification}
          relatedUser={relatedUser ?? undefined}
          relatedMeeting={relatedMeeting ?? undefined}
        />
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(notification._creationTime)}
        </div>
      </div>

      <Tippy content="Delete" delay={[200, 0]}>
        <button
          onClick={() => void handleRemove()}
          className="flex-shrink-0 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </Tippy>
    </div>
  );
}

function NotificationContent({
  notification,
  relatedUser,
  relatedMeeting,
}: {
  notification: Doc<"notifications">;
  relatedUser?: Doc<"users">;
  relatedMeeting?: Doc<"meetings">;
}) {
  switch (notification.type) {
    case "meeting_request":
      return (
        <span>
          {relatedUser ? <UserName user={relatedUser} /> : "Someone"} invited
          you to <MeetingName meeting={relatedMeeting} />
        </span>
      );

    case "meeting_accepted":
      return (
        <span>
          {relatedUser ? <UserName user={relatedUser} /> : "Someone"} accepted{" "}
          <MeetingName meeting={relatedMeeting} />
        </span>
      );

    case "meeting_declined":
      return (
        <span>
          {relatedUser ? <UserName user={relatedUser} /> : "Someone"} declined{" "}
          <MeetingName meeting={relatedMeeting} />
        </span>
      );

    case "meeting_cancelled":
      return (
        <span>
          <MeetingName meeting={relatedMeeting} /> was cancelled
        </span>
      );

    case "meeting_reminder":
      return (
        <span>
          Reminder: <MeetingName meeting={relatedMeeting} /> is coming up
        </span>
      );

    case "conference_announcement":
      return <span>{notification.title}</span>;

    default:
      return <span>{notification.title}</span>;
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
