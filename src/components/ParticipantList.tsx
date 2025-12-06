import { Users } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Button } from "@/components/ui/button";

type Participant = {
  _id: Id<"meetingParticipants">;
  userId: Id<"users">;
  status: "creator" | "accepted" | "pending" | "declined";
};

interface ParticipantListProps {
  participants: Participant[];
  usersMap: Map<Id<"users">, Doc<"users">>;
  showHeader?: boolean;
  maxHeight?: string;
  onUserClick?: (userId: Id<"users">) => void;
}

export function ParticipantList({
  participants,
  usersMap,
  showHeader = true,
  maxHeight = "max-h-40",
  onUserClick,
}: ParticipantListProps) {
  if (!participants || participants.length === 0) {
    return null;
  }

  return (
    <div>
      {showHeader && (
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Participants ({participants.length})
        </h4>
      )}
      <div className={`${maxHeight} overflow-y-auto border rounded-lg`}>
        <ul className="divide-y">
          {participants.map((p) => {
            const user = usersMap.get(p.userId);
            const userName = user?.name || "Unknown";

            return (
              <li
                key={p._id}
                className="flex items-center justify-between px-3 py-2"
              >
                {onUserClick && user ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => onUserClick(p.userId)}
                  >
                    {userName}
                  </Button>
                ) : (
                  <span className="text-sm">{userName}</span>
                )}
                <StatusBadge status={p.status} size="sm" />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
