import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Clock, MapPin, Users, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ParticipantList } from "./ParticipantList";

type ParticipantStatus = "creator" | "accepted" | "pending" | "declined" | "participant";

interface MeetingCardProps {
  meeting: Doc<"meetings">;
  /** Current user's participation status, if known */
  userStatus?: ParticipantStatus | null;
  /** Variant affects layout: 'compact' for lists, 'full' for detail views */
  variant?: "compact" | "full";
  /** Whether to show the participant list */
  showParticipants?: boolean;
  /** Whether to show action buttons (join/leave/accept/decline) */
  showActions?: boolean;
  /** Whether to show a link to the meeting detail page */
  showMeetingLink?: boolean;
  /** Callback when an action completes (for closing modals, etc.) */
  onActionComplete?: () => void;
}

export function MeetingCard({
  meeting,
  userStatus,
  variant = "compact",
  showParticipants = false,
  showActions = true,
  showMeetingLink = false,
  onActionComplete,
}: MeetingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const join = useMutation(api.meetingParticipants.join);
  const leave = useMutation(api.meetingParticipants.leave);
  const respond = useMutation(api.meetingParticipants.respond);

  const participants = useQuery(
    api.meetingParticipants.listByMeeting,
    showParticipants ? { meetingId: meeting._id } : "skip"
  );
  const allUsers = useQuery(api.users.listUsers, {});

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  const creator = usersMap.get(meeting.creatorId);

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await join({ meetingId: meeting._id });
      onActionComplete?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leave({ meetingId: meeting._id });
      onActionComplete?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    setIsLoading(true);
    try {
      await respond({ meetingId: meeting._id, accept });
      onActionComplete?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to respond");
    } finally {
      setIsLoading(false);
    }
  };

  const isParticipant = userStatus === "accepted" || userStatus === "creator" || userStatus === "participant";
  const isPending = userStatus === "pending";
  const isCreator = userStatus === "creator";

  const isCompact = variant === "compact";

  return (
    <div className={`card ${isCompact ? "card-border" : ""} bg-base-200`}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${isCompact ? "text-lg" : "text-2xl"}`}>
              {meeting.title}
            </h3>
            {showMeetingLink && (
              <Link
                to="/meeting/$meetingId"
                params={{ meetingId: meeting._id }}
                className="btn btn-ghost btn-xs btn-square"
                title="Open meeting page"
              >
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {meeting.isPublic && (
              <span className="badge badge-primary badge-sm">Public</span>
            )}
            {meeting.maxParticipants && (
              <span className="badge badge-warning badge-sm">
                Max {meeting.maxParticipants}
              </span>
            )}
            {isPending && (
              <span className="badge badge-warning badge-sm">Pending</span>
            )}
            {isParticipant && !isCreator && (
              <span className="badge badge-success badge-sm">Attending</span>
            )}
            {isCreator && (
              <span className="badge badge-primary badge-sm">Hosting</span>
            )}
          </div>
        </div>

        {/* Description */}
        {meeting.description && (
          <p className={`opacity-80 ${isCompact ? "text-sm mt-1" : "mt-2"}`}>
            {meeting.description}
          </p>
        )}

        {!isCompact && <div className="divider my-2"></div>}

        {/* Details */}
        <div className={`space-y-${isCompact ? "2" : "3"} ${isCompact ? "mt-3" : ""}`}>
          <div className={`flex items-center gap-${isCompact ? "2" : "3"} text-sm`}>
            <Clock className={`w-4 h-4 opacity-70`} />
            {isCompact ? (
              <>
                <span>{new Date(meeting.scheduledTime).toLocaleString()}</span>
                <span className="opacity-70">({meeting.duration} min)</span>
              </>
            ) : (
              <div>
                <div className="font-semibold">
                  {new Date(meeting.scheduledTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="opacity-70">
                  {new Date(meeting.scheduledTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(meeting.scheduledTime + meeting.duration * 60000).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" "}({meeting.duration} min)
                </div>
              </div>
            )}
          </div>

          {meeting.location && (
            <div className={`flex items-center gap-${isCompact ? "2" : "3"} text-sm`}>
              <MapPin className="w-4 h-4 opacity-70" />
              <span>{meeting.location}</span>
            </div>
          )}

          {!isCompact && meeting.maxParticipants && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 opacity-70" />
              <span>Max {meeting.maxParticipants} participants</span>
            </div>
          )}

          {creator && (
            <div className="text-sm">
              <span className="opacity-70">Hosted by: </span>
              {isCompact ? (
                <span className="font-semibold">{creator.name}</span>
              ) : (
                <Link
                  to="/user/$userId"
                  params={{ userId: creator._id }}
                  className="link link-hover link-primary font-semibold"
                >
                  {creator.name}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Participants */}
        {showParticipants && participants && participants.length > 0 && (
          <>
            {!isCompact && <div className="divider my-2"></div>}
            <div className={isCompact ? "mt-3" : ""}>
              <ParticipantList
                participants={participants}
                usersMap={usersMap}
                maxHeight={isCompact ? "max-h-32" : "max-h-60"}
                onUserClick={!isCompact ? (userId) => void navigate({ to: "/user/$userId", params: { userId } }) : undefined}
              />
            </div>
          </>
        )}

        {/* Actions */}
        {showActions && (
          <div className={`card-actions justify-end ${isCompact ? "mt-4" : "mt-6"}`}>
            {isPending && (
              <>
                <button
                  className={`btn btn-error ${isCompact ? "btn-sm" : ""}`}
                  onClick={() => void handleRespond(false)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Decline"}
                </button>
                <button
                  className={`btn btn-success ${isCompact ? "btn-sm" : ""}`}
                  onClick={() => void handleRespond(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Accept"}
                </button>
              </>
            )}

            {meeting.isPublic && !isParticipant && !isPending && (
              <button
                className={`btn btn-primary ${isCompact ? "btn-sm w-full" : ""}`}
                onClick={() => void handleJoin()}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Meeting"}
              </button>
            )}

            {isParticipant && !isCreator && (
              <button
                className={`btn btn-error ${isCompact ? "btn-sm w-full" : ""}`}
                onClick={() => void handleLeave()}
                disabled={isLoading}
              >
                {isLoading ? "Leaving..." : "Leave Meeting"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
