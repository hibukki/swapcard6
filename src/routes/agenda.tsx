import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const pendingInvitationsQuery = convexQuery(api.meetings.getPendingInvitations, {});
const sentRequestsQuery = convexQuery(api.meetings.getSentRequests, {});
const meetingsQuery = convexQuery(api.meetings.getMyMeetings, {});

export const Route = createFileRoute("/agenda")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(pendingInvitationsQuery),
        queryClient.ensureQueryData(sentRequestsQuery),
        queryClient.ensureQueryData(meetingsQuery),
      ]);
    }
  },
  component: AgendaPage,
});

function AgendaPage() {
  const { data: pendingInvitations } = useSuspenseQuery(pendingInvitationsQuery);
  const { data: sentRequests } = useSuspenseQuery(sentRequestsQuery);
  const { data: meetings } = useSuspenseQuery(meetingsQuery);

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
              {pendingInvitations.map((meeting) => (
                <IncomingRequestCard key={meeting._id} meeting={meeting} />
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
              {sentRequests.map((meeting) => (
                <div
                  key={meeting._id}
                  className="card card-border bg-base-200"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {meeting.recipients.map((r) => r.name).join(", ")}
                        </h3>
                        {meeting.recipients[0]?.role && (
                          <p className="text-sm opacity-70">
                            {meeting.recipients[0].role}
                          </p>
                        )}
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
            Scheduled Meetings ({meetings.length})
          </h2>
          {meetings.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No scheduled meetings yet
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id}
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
                          <div className="text-sm opacity-70 mt-2">
                            <strong>Participants ({meeting.participants?.length ?? 0}):</strong>{" "}
                            {meeting.participants
                              ?.map((p: any) => p.name)
                              .join(", ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className="badge badge-success">Confirmed</span>
                        {meeting.isPublic && (
                          <span className="badge badge-info">Public</span>
                        )}
                        {meeting.userRole === "creator" && (
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
  meeting,
}: {
  meeting: {
    _id: Id<"meetings">;
    requester: { name: string; role?: string } | null;
    description?: string;
    location?: string;
    scheduledTime: number;
    duration: number;
  };
}) {
  const respondToInvitation = useMutation(api.meetings.respondToInvitation);
  const [isResponding, setIsResponding] = useState(false);

  const handleRespond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await respondToInvitation({
        meetingId: meeting._id,
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
            <h3 className="font-semibold">{meeting.requester?.name}</h3>
            {meeting.requester?.role && (
              <p className="text-sm opacity-70">{meeting.requester.role}</p>
            )}
            {meeting.description && (
              <p className="text-sm mt-2 opacity-80">{meeting.description}</p>
            )}
            <div className="mt-2 space-y-1">
              <p className="text-sm opacity-70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(meeting.scheduledTime).toLocaleString()}
                {` (${meeting.duration} min)`}
              </p>
              {meeting.location && (
                <p className="text-sm opacity-70 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {meeting.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-success btn-sm"
              onClick={() => void handleRespond(true)}
              disabled={isResponding}
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={() => void handleRespond(false)}
              disabled={isResponding}
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
