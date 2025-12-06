import { Link } from "@tanstack/react-router";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatRoomWithDetails {
  room: Doc<"chatRooms">;
  participantIds: Id<"users">[];
}

interface ChatRoomListProps {
  rooms: ChatRoomWithDetails[];
  users: Map<Id<"users">, Doc<"users">>;
  currentUserId: Id<"users">;
  selectedRoomId?: Id<"chatRooms">;
}

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  return date.toISOString().split("T")[0];
}

function getOtherParticipants(
  participantIds: Id<"users">[],
  currentUserId: Id<"users">,
  users: Map<Id<"users">, Doc<"users">>
): Doc<"users">[] {
  return participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => users.get(id))
    .filter((u): u is Doc<"users"> => u !== undefined);
}

export function ChatRoomList({
  rooms,
  users,
  currentUserId,
  selectedRoomId,
}: ChatRoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="divide-y">
      {rooms.map(({ room, participantIds }) => {
        const otherParticipants = getOtherParticipants(
          participantIds,
          currentUserId,
          users
        );
        const isSelected = room._id === selectedRoomId;

        const displayName =
          otherParticipants.length > 0
            ? otherParticipants.map((u) => u.name).join(", ")
            : "Unknown";

        const avatarUrl = otherParticipants[0]?.imageUrl;
        const avatarInitial =
          otherParticipants[0]?.name?.charAt(0).toUpperCase() ?? "?";

        return (
          <Link
            key={room._id}
            to="/chat/$chatRoomId"
            params={{ chatRoomId: room._id }}
            className={cn(
              "flex items-center gap-3 p-3 hover:bg-accent transition-colors",
              isSelected && "bg-accent"
            )}
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={avatarUrl} alt="" />
              <AvatarFallback className="bg-primary/20 text-primary font-medium">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>

            {/* Name and time */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatTimestamp(room.lastMessageAt)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
