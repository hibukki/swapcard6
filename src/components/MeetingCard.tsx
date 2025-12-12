import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Clock, MapPin, Users, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ParticipantList } from "./ParticipantList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserName } from "@/components/patterns/UserName";
import { ShortDate, ShortTimeRange } from "@/components/patterns/ShortDate";
import { cn } from "@/lib/utils";
import { handleMutationError } from "@/lib/error-handling";

type ParticipantStatus =
  | "creator"
  | "accepted"
  | "pending"
  | "declined"
  | "participant";

interface MeetingCardProps {
  meeting: Doc<"meetings"> & { participantCount?: number };
  userStatus?: ParticipantStatus | null;
  variant?: "compact" | "full";
  showParticipants?: boolean;
  showActions?: boolean;
  showMeetingLink?: boolean;
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const navigate = useNavigate();

  const join = useMutation(api.meetingParticipants.join);
  const leave = useMutation(api.meetingParticipants.leave);
  const respond = useMutation(api.meetingParticipants.respond);
  const remove = useMutation(api.meetings.remove);

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
      handleMutationError(error, "Failed to join meeting");
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
      handleMutationError(error, "Failed to leave meeting");
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
      handleMutationError(error, "Failed to respond");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await remove({ meetingId: meeting._id });
      onActionComplete?.();
    } catch (error) {
      handleMutationError(error, "Failed to cancel meeting");
    } finally {
      setIsLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const isParticipant =
    userStatus === "accepted" ||
    userStatus === "creator" ||
    userStatus === "participant";
  const isPending = userStatus === "pending";
  const isCreator = userStatus === "creator";

  const isCompact = variant === "compact";

  return (
    <Card className={cn(isCompact && "border")}>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3
              className={cn("font-semibold", isCompact ? "text-lg" : "text-2xl")}
            >
              {meeting.title}
            </h3>
            {showMeetingLink && (
              <Link
                to="/meeting/$meetingId"
                params={{ meetingId: meeting._id }}
                title="Open meeting page"
              >
                <Button variant="ghost" size="icon-xs">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {meeting.isPublic && <Badge size="sm">Public</Badge>}
            {meeting.maxParticipants && (
              <Tippy
                content={`Registered: ${meeting.participantCount ?? "?"} · Max: ${meeting.maxParticipants}`}
                delay={[200, 0]}
              >
                <span>
                  <Badge variant="warning" size="sm">
                    {meeting.participantCount ?? "?"}/{meeting.maxParticipants}
                  </Badge>
                </span>
              </Tippy>
            )}
            {isPending && (
              <Badge variant="warning" size="sm">
                Pending
              </Badge>
            )}
            {isParticipant && !isCreator && (
              <Badge variant="success" size="sm">
                Attending
              </Badge>
            )}
            {isCreator && <Badge size="sm">Hosting</Badge>}
          </div>
        </div>

        {/* Description */}
        {meeting.description && (
          <p
            className={cn(
              "text-muted-foreground",
              isCompact ? "text-sm mt-1" : "mt-2"
            )}
          >
            {meeting.description}
          </p>
        )}

        {!isCompact && <Separator className="my-4" />}

        {/* Details */}
        <div className={cn("space-y-2", isCompact ? "mt-3" : "space-y-3")}>
          <div
            className={cn(
              "flex items-center text-sm",
              isCompact ? "gap-2" : "gap-3"
            )}
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            {isCompact ? (
              <>
                <ShortDate timestamp={meeting.scheduledTime} />
                <span className="text-muted-foreground">
                  ({meeting.duration} min)
                </span>
              </>
            ) : (
              <div>
                <div className="font-semibold">
                  <ShortDate timestamp={meeting.scheduledTime} />
                </div>
                <div className="text-muted-foreground">
                  <ShortTimeRange
                    startTime={meeting.scheduledTime}
                    endTime={meeting.scheduledTime + meeting.duration * 60000}
                  />{" "}
                  ({meeting.duration} min)
                </div>
              </div>
            )}
          </div>

          {meeting.location && (
            <div
              className={cn(
                "flex items-center text-sm",
                isCompact ? "gap-2" : "gap-3"
              )}
            >
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{meeting.location}</span>
            </div>
          )}

          {!isCompact && meeting.maxParticipants && (
            <Tippy
              content={`Registered: ${meeting.participantCount ?? "?"} · Max: ${meeting.maxParticipants}`}
              delay={[200, 0]}
            >
              <div className="flex items-center gap-3 text-sm cursor-help">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  {meeting.participantCount ?? "?"}/{meeting.maxParticipants}{" "}
                  participants
                </span>
              </div>
            </Tippy>
          )}

          {creator && (
            <div className="text-sm">
              <span className="text-muted-foreground">Hosted by: </span>
              <UserName user={creator} />
            </div>
          )}
        </div>

        {/* Participants */}
        {showParticipants && participants && participants.length > 0 && (
          <>
            {!isCompact && <Separator className="my-4" />}
            <div className={cn(isCompact && "mt-3")}>
              <ParticipantList
                participants={participants}
                usersMap={usersMap}
                maxHeight={isCompact ? "max-h-32" : "max-h-60"}
                onUserClick={
                  !isCompact
                    ? (userId) =>
                        void navigate({
                          to: "/user/$userId",
                          params: { userId },
                        })
                    : undefined
                }
              />
            </div>
          </>
        )}

        {/* Actions */}
        {showActions && (
          <div
            className={cn(
              "flex justify-end gap-2",
              isCompact ? "mt-4" : "mt-6"
            )}
          >
            {isPending && (
              <>
                <Button
                  variant="destructive"
                  size={isCompact ? "sm" : "default"}
                  onClick={() => void handleRespond(false)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Decline"}
                </Button>
                <Button
                  variant="success"
                  size={isCompact ? "sm" : "default"}
                  onClick={() => void handleRespond(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Accept"}
                </Button>
              </>
            )}

            {meeting.isPublic && !isParticipant && !isPending && (
              <Button
                size={isCompact ? "sm" : "default"}
                className={cn(isCompact && "w-full")}
                onClick={() => void handleJoin()}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Meeting"}
              </Button>
            )}

            {isParticipant && !isCreator && (
              <Button
                variant="destructive"
                size={isCompact ? "sm" : "default"}
                className={cn(isCompact && "w-full")}
                onClick={() => void handleLeave()}
                disabled={isLoading}
              >
                {isLoading ? "Leaving..." : "Leave Meeting"}
              </Button>
            )}

            {isCreator && !showCancelConfirm && (
              <Button
                variant="destructive"
                size={isCompact ? "sm" : "default"}
                onClick={() => setShowCancelConfirm(true)}
                disabled={isLoading}
              >
                Cancel Meeting
              </Button>
            )}

            {isCreator && showCancelConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cancel?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isLoading}
                >
                  No
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleCancel()}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Yes"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
