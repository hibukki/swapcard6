import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Clock, MapPin, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const publicMeetingsQuery = convexQuery(api.meetings.getPublicMeetings, {});

export const Route = createFileRoute("/public-meetings")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(publicMeetingsQuery);
    }
  },
  component: PublicMeetingsPage,
});

function PublicMeetingsPage() {
  const { data: meetings } = useSuspenseQuery(publicMeetingsQuery);
  const joinMeeting = useMutation(api.meetings.joinMeeting);
  const leaveMeeting = useMutation(api.meetings.leaveMeeting);
  const [joiningMeetingId, setJoiningMeetingId] = useState<Id<"meetings"> | null>(null);

  const handleJoinMeeting = async (meetingId: Id<"meetings">) => {
    setJoiningMeetingId(meetingId);
    try {
      await joinMeeting({ meetingId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join meeting");
    } finally {
      setJoiningMeetingId(null);
    }
  };

  const handleLeaveMeeting = async (meetingId: Id<"meetings">) => {
    setJoiningMeetingId(meetingId);
    try {
      await leaveMeeting({ meetingId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave meeting");
    } finally {
      setJoiningMeetingId(null);
    }
  };

  // Separate upcoming and past meetings
  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => m.scheduledTime >= now);
  const pastMeetings = meetings.filter((m) => m.scheduledTime < now);

  return (
    <div>
      <h1 className="mt-0">Public Meetings</h1>
      <p>Browse and join public meetings open to all attendees</p>

      <div className="not-prose mt-8 space-y-8">
        {/* Upcoming Public Meetings */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No upcoming public meetings
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingMeetings.map((meeting) => {
                const isParticipant = meeting.participants.some(
                  (p: any) => p.role !== undefined
                );
                return (
                  <div
                    key={meeting._id}
                    className="card card-border bg-base-200"
                  >
                    <div className="card-body">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        {meeting.isFull && (
                          <span className="badge badge-warning">Full</span>
                        )}
                      </div>

                      {meeting.description && (
                        <p className="text-sm opacity-80 mt-1">
                          {meeting.description}
                        </p>
                      )}

                      <div className="mt-3 space-y-2">
                        <div className="text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 opacity-70" />
                          <span>
                            {new Date(meeting.scheduledTime).toLocaleString()}
                          </span>
                          <span className="opacity-70">
                            ({meeting.duration} min)
                          </span>
                        </div>

                        {meeting.location && (
                          <div className="text-sm flex items-center gap-2">
                            <MapPin className="w-4 h-4 opacity-70" />
                            <span>{meeting.location}</span>
                          </div>
                        )}

                        <div className="text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 opacity-70" />
                          <span>
                            {meeting.participantCount}
                            {meeting.maxParticipants
                              ? ` / ${meeting.maxParticipants}`
                              : ""}{" "}
                            participants
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="opacity-70">Hosted by: </span>
                          <span className="font-semibold">
                            {meeting.creator?.name}
                          </span>
                        </div>
                      </div>

                      {/* Participant avatars/list */}
                      {meeting.participants.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs opacity-70 mb-1">
                            Participants:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {meeting.participants.slice(0, 5).map((p: any) => (
                              <span
                                key={p._id}
                                className="badge badge-sm"
                                title={p.name}
                              >
                                {p.name}
                              </span>
                            ))}
                            {meeting.participants.length > 5 && (
                              <span className="badge badge-sm opacity-70">
                                +{meeting.participants.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="card-actions mt-4">
                        {isParticipant ? (
                          <button
                            className="btn btn-error btn-sm w-full"
                            onClick={() => void handleLeaveMeeting(meeting._id)}
                            disabled={joiningMeetingId === meeting._id}
                          >
                            Leave Meeting
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm w-full gap-2"
                            onClick={() => void handleJoinMeeting(meeting._id)}
                            disabled={
                              meeting.isFull || joiningMeetingId === meeting._id
                            }
                          >
                            <UserPlus className="w-4 h-4" />
                            {joiningMeetingId === meeting._id
                              ? "Joining..."
                              : "Join Meeting"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past Public Meetings */}
        {pastMeetings.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 opacity-50" />
              Past Meetings ({pastMeetings.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastMeetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="card card-border bg-base-200 opacity-60"
                >
                  <div className="card-body">
                    <h3 className="font-semibold">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-sm opacity-80">{meeting.description}</p>
                    )}
                    <div className="text-sm mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(meeting.scheduledTime).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {meeting.participantCount} participants
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
