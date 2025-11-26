import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Clock, MapPin, Users, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { ParticipantList } from "../components/ParticipantList";

export const Route = createFileRoute("/meeting/$meetingId")({
  loader: async ({ context: { queryClient }, params }) => {
    const meetingQuery = convexQuery(api.meetings.get, {
      meetingId: params.meetingId as Id<"meetings">,
    });
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(meetingQuery);
    }
  },
  component: MeetingPage,
});

function MeetingPage() {
  const { meetingId } = Route.useParams();
  const [isLoading, setIsLoading] = useState(false);

  const { data: meeting } = useSuspenseQuery(
    convexQuery(api.meetings.get, { meetingId: meetingId as Id<"meetings"> })
  );

  const participants = useQuery(api.meetingParticipants.listByMeeting, {
    meetingId: meetingId as Id<"meetings">,
  });
  const allUsers = useQuery(api.users.listUsers, {});
  const myParticipation = useQuery(api.meetingParticipants.getCurrentUserParticipation, {
    meetingId: meetingId as Id<"meetings">,
  });

  const join = useMutation(api.meetingParticipants.join);
  const leave = useMutation(api.meetingParticipants.leave);
  const respond = useMutation(api.meetingParticipants.respond);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  const creator = meeting ? usersMap.get(meeting.creatorId) : undefined;

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await join({ meetingId: meetingId as Id<"meetings"> });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leave({ meetingId: meetingId as Id<"meetings"> });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    setIsLoading(true);
    try {
      await respond({ meetingId: meetingId as Id<"meetings">, accept });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to respond");
    } finally {
      setIsLoading(false);
    }
  };

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Meeting Not Found</h1>
        <p className="opacity-70 mb-6">This meeting may have been deleted or you don't have access to it.</p>
        <Link to="/calendar" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </Link>
      </div>
    );
  }

  const isParticipant = myParticipation && (myParticipation.status === "accepted" || myParticipation.status === "creator");
  const isPending = myParticipation?.status === "pending";
  const isCreator = myParticipation?.status === "creator";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/calendar" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </Link>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="card-title text-2xl">{meeting.title}</h1>
            <div className="flex gap-2 flex-wrap">
              {meeting.isPublic && (
                <span className="badge badge-primary">Public</span>
              )}
              {isPending && (
                <span className="badge badge-warning">Pending Invitation</span>
              )}
              {isParticipant && !isCreator && (
                <span className="badge badge-success">Attending</span>
              )}
              {isCreator && (
                <span className="badge badge-primary">You're hosting</span>
              )}
            </div>
          </div>

          {meeting.description && (
            <p className="opacity-80 mt-2">{meeting.description}</p>
          )}

          <div className="divider"></div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 opacity-70" />
              <div>
                <div className="font-semibold">
                  {new Date(meeting.scheduledTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm opacity-70">
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
            </div>

            {meeting.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 opacity-70" />
                <span>{meeting.location}</span>
              </div>
            )}

            {meeting.maxParticipants && (
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 opacity-70" />
                <span>Max {meeting.maxParticipants} participants</span>
              </div>
            )}

            {creator && (
              <div className="flex items-center gap-3">
                <span className="opacity-70">Hosted by:</span>
                <Link
                  to="/user/$userId"
                  params={{ userId: creator._id }}
                  className="link link-hover link-primary font-semibold"
                >
                  {creator.name}
                </Link>
              </div>
            )}
          </div>

          {/* Participants */}
          {participants && participants.length > 0 && (
            <>
              <div className="divider"></div>
              <ParticipantList
                participants={participants}
                usersMap={usersMap}
                maxHeight="max-h-60"
                linkToProfile
              />
            </>
          )}

          {/* Actions */}
          <div className="card-actions justify-end mt-6">
            {isPending && (
              <>
                <button
                  className="btn btn-error"
                  onClick={() => void handleRespond(false)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Decline"}
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => void handleRespond(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Accept"}
                </button>
              </>
            )}

            {meeting.isPublic && !isParticipant && !isPending && (
              <button
                className="btn btn-primary"
                onClick={() => void handleJoin()}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Meeting"}
              </button>
            )}

            {isParticipant && !isCreator && (
              <button
                className="btn btn-error"
                onClick={() => void handleLeave()}
                disabled={isLoading}
              >
                {isLoading ? "Leaving..." : "Leave Meeting"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
