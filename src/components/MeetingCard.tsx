import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Clock, MapPin, Users, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ParticipantList } from "./ParticipantList";
import { LocationPicker } from "./LocationPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserName } from "@/components/patterns/UserName";
import { ShortDate, ShortTimeRange } from "@/components/patterns/ShortDate";
import { cn } from "@/lib/utils";
import { handleMutationError } from "@/lib/error-handling";
import { formatDateTimeLocal } from "@/lib/date-format";
import { useConferenceOptional } from "@/contexts/ConferenceContext";

type ParticipantStatus =
  | "creator"
  | "accepted"
  | "pending"
  | "declined"
  | "participant";

interface MeetingCardProps {
  meeting: Doc<"meetings">;
  userStatus?: ParticipantStatus | null;
  variant?: "compact" | "full";
  showParticipants?: boolean;
  showActions?: boolean;
  showMeetingLink?: boolean;
  onJoinComplete?: () => void;
  onLeaveComplete?: () => void;
  onResponseComplete?: () => void;
  onMeetingCanceled?: () => void;
  onEditComplete?: () => void;
}

export function MeetingCard({
  meeting,
  userStatus,
  variant = "compact",
  showParticipants = false,
  showActions = true,
  showMeetingLink = false,
  onJoinComplete,
  onLeaveComplete,
  onResponseComplete,
  onMeetingCanceled,
  onEditComplete,
}: MeetingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: meeting.title,
    description: meeting.description ?? "",
    scheduledTime: formatDateTimeLocal(new Date(meeting.scheduledTime)),
    duration: meeting.duration,
    location: meeting.location ?? "",
  });
  const navigate = useNavigate();

  const join = useMutation(api.meetingParticipants.join);
  const leave = useMutation(api.meetingParticipants.leave);
  const respond = useMutation(api.meetingParticipants.respond);
  const remove = useMutation(api.meetings.remove);
  const update = useMutation(api.meetings.update);

  const conference = useConferenceOptional();

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
      onJoinComplete?.();
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
      onLeaveComplete?.();
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
      onResponseComplete?.();
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
      onMeetingCanceled?.();
    } catch (error) {
      handleMutationError(error, "Failed to cancel meeting");
    } finally {
      setIsLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleStartEdit = () => {
    setEditForm({
      title: meeting.title,
      description: meeting.description ?? "",
      scheduledTime: formatDateTimeLocal(new Date(meeting.scheduledTime)),
      duration: meeting.duration,
      location: meeting.location ?? "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      await update({
        meetingId: meeting._id,
        title: editForm.title,
        description: editForm.description || undefined,
        scheduledTime: new Date(editForm.scheduledTime).getTime(),
        duration: editForm.duration,
        location: editForm.location || undefined,
      });
      setIsEditing(false);
      onEditComplete?.();
    } catch (error) {
      handleMutationError(error, "Failed to update meeting");
    } finally {
      setIsLoading(false);
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
            {isEditing ? (
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className={cn(isCompact ? "text-lg" : "text-2xl", "font-semibold h-auto py-1")}
                autoFocus
              />
            ) : showMeetingLink && meeting.conferenceId ? (
              <Link
                to="/conference/$conferenceId/meeting/$meetingId"
                params={{ conferenceId: meeting.conferenceId, meetingId: meeting._id }}
                className="hover:underline"
              >
                <h3
                  className={cn("font-semibold", isCompact ? "text-lg" : "text-2xl")}
                >
                  {meeting.title}
                </h3>
              </Link>
            ) : (
              <h3
                className={cn("font-semibold", isCompact ? "text-lg" : "text-2xl")}
              >
                {meeting.title}
              </h3>
            )}
            {isCreator && !isEditing && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleStartEdit}
                title="Edit meeting"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {meeting.isPublic && <Badge size="sm">Public</Badge>}
            {meeting.maxParticipants && (
              <Badge variant="warning" size="sm">
                Max {meeting.maxParticipants}
              </Badge>
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
        {isEditing ? (
          <Textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
            placeholder="Description (optional)"
            className={cn(isCompact ? "text-sm mt-1" : "mt-2")}
            rows={2}
          />
        ) : meeting.description ? (
          <p
            className={cn(
              "text-muted-foreground",
              isCompact ? "text-sm mt-1" : "mt-2"
            )}
          >
            {meeting.description}
          </p>
        ) : null}

        {!isCompact && <Separator className="my-4" />}

        {/* Details */}
        <div className={cn("space-y-2", isCompact ? "mt-3" : "space-y-3")}>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="datetime-local"
                  value={editForm.scheduledTime}
                  onChange={(e) =>
                    setEditForm({ ...editForm, scheduledTime: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value > 0) {
                      setEditForm({ ...editForm, duration: value });
                    }
                  }}
                  min="1"
                  max="1440"
                  className="text-sm w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
          ) : (
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
          )}

          {isEditing ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <LocationPicker
                conferenceId={conference?._id}
                value={editForm.location}
                onChange={(location) => setEditForm({ ...editForm, location })}
                placeholder="Location (optional)"
              />
            </div>
          ) : meeting.location ? (
            <div
              className={cn(
                "flex items-center text-sm",
                isCompact ? "gap-2" : "gap-3"
              )}
            >
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{meeting.location}</span>
            </div>
          ) : null}

          {!isCompact && meeting.maxParticipants && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Max {meeting.maxParticipants} participants</span>
            </div>
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
                  !isCompact && meeting.conferenceId
                    ? (userId) =>
                        void navigate({
                          to: "/conference/$conferenceId/attendee/$userId",
                          params: { conferenceId: meeting.conferenceId, userId },
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
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size={isCompact ? "sm" : "default"}
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size={isCompact ? "sm" : "default"}
                  onClick={() => void handleSaveEdit()}
                  disabled={isLoading || !editForm.title.trim() || !editForm.scheduledTime || !(editForm.duration > 0)}
                >
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </>
            )}

            {!isEditing && isPending && (
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

            {!isEditing && meeting.isPublic && !isParticipant && !isPending && (
              <Button
                size={isCompact ? "sm" : "default"}
                className={cn(isCompact && "w-full")}
                onClick={() => void handleJoin()}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Meeting"}
              </Button>
            )}

            {!isEditing && isParticipant && !isCreator && (
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

            {!isEditing && isCreator && !showCancelConfirm && (
              <Button
                variant="destructive"
                size={isCompact ? "sm" : "default"}
                onClick={() => setShowCancelConfirm(true)}
                disabled={isLoading}
              >
                Cancel Meeting
              </Button>
            )}

            {!isEditing && isCreator && showCancelConfirm && (
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
