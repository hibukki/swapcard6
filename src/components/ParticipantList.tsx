import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

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
  linkToProfile?: boolean;
}

const statusBadgeConfig = {
  creator: { class: "badge-primary", label: "Host" },
  accepted: { class: "badge-success", label: "Accepted" },
  pending: { class: "badge-warning", label: "Pending" },
  declined: { class: "badge-error", label: "Declined" },
} as const;

export function ParticipantList({
  participants,
  usersMap,
  showHeader = true,
  maxHeight = "max-h-40",
  linkToProfile = false,
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
      <div className={`${maxHeight} overflow-y-auto border border-base-300 rounded-lg`}>
        <ul className="divide-y divide-base-300">
          {participants.map((p) => {
            const user = usersMap.get(p.userId);
            const badge = statusBadgeConfig[p.status] || { class: "badge-ghost", label: p.status };
            const userName = user?.name || "Unknown";

            return (
              <li key={p._id} className="flex items-center justify-between px-3 py-2">
                {linkToProfile && user ? (
                  <Link
                    to="/user/$userId"
                    params={{ userId: p.userId }}
                    className="text-sm link link-hover link-primary"
                  >
                    {userName}
                  </Link>
                ) : (
                  <span className="text-sm">{userName}</span>
                )}
                <span className={`badge badge-sm ${badge.class}`}>
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
