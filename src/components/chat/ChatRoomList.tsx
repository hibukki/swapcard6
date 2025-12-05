import { Link } from "@tanstack/react-router";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

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

  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  // ISO format for geeks: yyyy-mm-dd
  return date.toISOString().split("T")[0];
}

function getOtherParticipants(
  participantIds: Id<"users">[],
  currentUserId: Id<"users">,
  users: Map<Id<"users">, Doc<"users">>,
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
      <div className="p-4 text-center text-base-content/50">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-base-300">
      {rooms.map(({ room, participantIds }) => {
        const otherParticipants = getOtherParticipants(participantIds, currentUserId, users);
        const isSelected = room._id === selectedRoomId;

        // Display name: other participants' names
        const displayName =
          otherParticipants.length > 0
            ? otherParticipants.map((u) => u.name).join(", ")
            : "Unknown";

        // First participant's avatar
        const avatarUrl = otherParticipants[0]?.imageUrl;
        const avatarInitial = otherParticipants[0]?.name?.charAt(0).toUpperCase() ?? "?";

        return (
          <Link
            key={room._id}
            to="/chat/$chatRoomId"
            params={{ chatRoomId: room._id }}
            className={`flex items-center gap-3 p-3 hover:bg-base-300 transition-colors ${
              isSelected ? "bg-base-300" : ""
            }`}
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium flex-shrink-0">
                {avatarInitial}
              </div>
            )}

            {/* Name and time */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium truncate">{displayName}</span>
                <span className="text-xs text-base-content/50 flex-shrink-0">
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
