import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/patterns/EmptyState";

const myParticipationsQuery = convexQuery(
  api.meetingParticipants.listMeetingsForCurrentUser,
  {}
);

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

  const meetingsMap = useMemo(() => {
    if (!allMeetings) return new Map<Id<"meetings">, Doc<"meetings">>();
    return new Map(allMeetings.map((m) => [m._id, m]));
  }, [allMeetings]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  type Participation = Doc<"meetingParticipants">;
  type EnrichedInvitation = {
    participation: Participation;
    meeting: Doc<"meetings">;
    requester: Doc<"users"> | null | undefined;
  };
  type EnrichedMeeting = {
    participation: Participation;
    meeting: Doc<"meetings">;
  };

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
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="not-prose mt-8 space-y-8">
        {/* Incoming Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Incoming Requests ({pendingInvitations.length})
          </h2>
          {pendingInvitations.length === 0 ? (
            <EmptyState description="No pending requests" />
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map(
                ({ participation, meeting, requester }) => (
                  <IncomingRequestCard
                    key={participation._id}
                    meetingId={meeting._id}
                    requester={requester}
                    description={meeting.description}
                    location={meeting.location}
                    scheduledTime={meeting.scheduledTime}
                    duration={meeting.duration}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Sent Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4">
            Sent Requests ({sentRequests.length})
          </h2>
          {sentRequests.length === 0 ? (
            <EmptyState description="No pending sent requests" />
          ) : (
            <div className="space-y-3">
              {sentRequests.map(({ participation, meeting }) => (
                <Card key={participation._id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{meeting.title}</h3>
                        <p className="text-sm mt-2 text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(meeting.scheduledTime).toLocaleString()}
                          {` (${meeting.duration} min)`}
                        </p>
                        {meeting.description && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            {meeting.description}
                          </p>
                        )}
                        {meeting.location && (
                          <p className="text-sm mt-1 text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {meeting.location}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </CardContent>
                </Card>
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
            <EmptyState description="No scheduled meetings yet" />
          ) : (
            <div className="space-y-3">
              {confirmedMeetings.map(({ participation, meeting }) => (
                <Card key={participation._id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{meeting.title}</h3>
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mt-1">
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
                        <Badge variant="success">Confirmed</Badge>
                        {meeting.isPublic && <Badge variant="info">Public</Badge>}
                        {participation.status === "creator" && (
                          <Badge variant="secondary">Creator</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold">{requester?.name ?? "Unknown"}</h3>
            {requester?.role && (
              <p className="text-sm text-muted-foreground">{requester.role}</p>
            )}
            {description && (
              <p className="text-sm mt-2 text-muted-foreground">{description}</p>
            )}
            <div className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(scheduledTime).toLocaleString()}
                {` (${duration} min)`}
              </p>
              {location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => void handleRespond(true)}
              disabled={isResponding}
            >
              <Check className="w-4 h-4" />
              Accept
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleRespond(false)}
              disabled={isResponding}
            >
              <X className="w-4 h-4" />
              Decline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
