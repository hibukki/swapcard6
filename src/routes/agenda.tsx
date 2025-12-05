import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";

const myParticipationsQuery = convexQuery(api.meetingParticipants.listMeetingsForCurrentUser, {});

export const Route = createFileRoute("/agenda")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(myParticipationsQuery);
    }
  },
  component: AgendaPage,
});

function AgendaPage() {
  const { data: participations } = useSuspenseQuery(myParticipationsQuery);
  const allMeetings = useQuery(api.meetings.list, {});
  const allUsers = useQuery(api.users.listUsers, {});

  // Build lookup maps
  const meetingsMap = useMemo(() => {
    if (!allMeetings) return new Map<Id<"meetings">, Doc<"meetings">>();
    return new Map(allMeetings.map((m) => [m._id, m]));
  }, [allMeetings]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  type Participation = Doc<"meetingParticipants">;
  type EnrichedInvitation = { participation: Participation; meeting: Doc<"meetings">; requester: Doc<"users"> | null | undefined };
  type EnrichedMeeting = { participation: Participation; meeting: Doc<"meetings"> };

  // Filter and enrich participations
  const pendingInvitations = useMemo((): EnrichedInvitation[] => {
    const results: EnrichedInvitation[] = [];
    for (const p of participations) {
      if (p.status !== "pending") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;
      const requester = usersMap.get(meeting.creatorId);
      results.push({ participation: p, meeting, requester });
    }
    return results;
  }, [participations, meetingsMap, usersMap]);

  const sentRequests = useMemo((): EnrichedMeeting[] => {
    // Get meetings where I'm the creator and there are pending participants
    const results: EnrichedMeeting[] = [];
    for (const p of participations) {
      if (p.status !== "creator") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting || meeting.isPublic) continue;
      results.push({ participation: p, meeting });
    }
    return results;
  }, [participations, meetingsMap]);

  const confirmedMeetings = useMemo((): EnrichedMeeting[] => {
    const results: EnrichedMeeting[] = [];
    for (const p of participations) {
      if (p.status !== "accepted" && p.status !== "creator") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;
      results.push({ participation: p, meeting });
    }
    return results;
  }, [participations, meetingsMap]);

  if (!allMeetings || !allUsers) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mt-0">My Agenda</h1>
      <p>Manage your meeting requests and view your schedule</p>

      <div className="not-prose mt-8 space-y-8">
        {/* Incoming Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Incoming Requests ({pendingInvitations.length})
          </h2>
          {pendingInvitations.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map(({ participation, meeting, requester }) => (
                <IncomingRequestCard
                  key={participation._id}
                  meetingId={meeting._id}
                  requester={requester}
                  description={meeting.description}
                  location={meeting.location}
                  scheduledTime={meeting.scheduledTime}
                  duration={meeting.duration}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sent Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4">
            Sent Requests ({sentRequests.length})
          </h2>
          {sentRequests.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No pending sent requests
            </div>
          ) : (
            <div className="space-y-3">
              {sentRequests.map(({ participation, meeting }) => (
                <div
                  key={participation._id}
                  className="card card-border bg-base-200"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {meeting.title}
                        </h3>
                        <p className="text-sm mt-2 opacity-80 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(meeting.scheduledTime).toLocaleString()}
                          {` (${meeting.duration} min)`}
                        </p>
                        {meeting.description && (
                          <p className="text-sm mt-2 opacity-80">
                            {meeting.description}
                          </p>
                        )}
                        {meeting.location && (
                          <p className="text-sm mt-1 opacity-70 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {meeting.location}
                          </p>
                        )}
                      </div>
                      <span className="badge">Pending</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Scheduled Meetings */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Meetings ({confirmedMeetings.length})
          </h2>
          {confirmedMeetings.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No scheduled meetings yet
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedMeetings.map(({ participation, meeting }) => (
                <div
                  key={participation._id}
                  className="card card-border bg-base-200"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {meeting.title}
                        </h3>
                        {meeting.description && (
                          <p className="text-sm opacity-70 mt-1">
                            {meeting.description}
                          </p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(meeting.scheduledTime).toLocaleString()} (
                            {meeting.duration} min)
                          </p>
                          {meeting.location && (
                            <p className="text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {meeting.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className="badge badge-success">Confirmed</span>
                        {meeting.isPublic && (
                          <span className="badge badge-info">Public</span>
                        )}
                        {participation.status === "creator" && (
                          <span className="badge">Creator</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function IncomingRequestCard({
  meetingId,
  requester,
  description,
  location,
  scheduledTime,
  duration,
}: {
  meetingId: Id<"meetings">;
  requester: Doc<"users"> | null | undefined;
  description?: string;
  location?: string;
  scheduledTime: number;
  duration: number;
}) {
  const respond = useMutation(api.meetingParticipants.respond);
  const [isResponding, setIsResponding] = useState(false);

  const handleRespond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await respond({
        meetingId,
        accept,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to respond");
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {requester ? (
              <Link
                to="/user/$userId"
                params={{ userId: requester._id }}
                className="font-semibold link link-hover"
              >
                {requester.name}
              </Link>
            ) : (
              <h3 className="font-semibold">Unknown</h3>
            )}
            {requester?.role && (
              <p className="text-sm opacity-70">{requester.role}</p>
            )}
            {description && (
              <p className="text-sm mt-2 opacity-80">{description}</p>
            )}
            <div className="mt-2 space-y-1">
              <p className="text-sm opacity-70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(scheduledTime).toLocaleString()}
                {` (${duration} min)`}
              </p>
              {location && (
                <p className="text-sm opacity-70 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-success btn-sm"
              onClick={() => void handleRespond(true)}
              disabled={isResponding}
              title="Accept"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={() => void handleRespond(false)}
              disabled={isResponding}
              title="Decline"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
