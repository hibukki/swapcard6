import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const requestsQuery = convexQuery(api.meetings.getMyRequests, {});
const meetingsQuery = convexQuery(api.meetings.getMyMeetings, {});

export const Route = createFileRoute("/agenda")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(requestsQuery),
        queryClient.ensureQueryData(meetingsQuery),
      ]);
    }
  },
  component: AgendaPage,
});

function AgendaPage() {
  const { data: requests } = useSuspenseQuery(requestsQuery);
  const { data: meetings } = useSuspenseQuery(meetingsQuery);

  const pendingReceived = requests.received.filter((r) => r.status === "pending");
  const pendingSent = requests.sent.filter((r) => r.status === "pending");

  return (
    <div>
      <h1 className="mt-0">My Agenda</h1>
      <p>Manage your meeting requests and view your schedule</p>

      <div className="not-prose mt-8 space-y-8">
        {/* Incoming Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Incoming Requests ({pendingReceived.length})
          </h2>
          {pendingReceived.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReceived.map((request) => (
                <IncomingRequestCard key={request._id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* Sent Requests */}
        <section>
          <h2 className="text-xl font-bold mb-4">
            Sent Requests ({pendingSent.length})
          </h2>
          {pendingSent.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No pending sent requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSent.map((request) => (
                <div
                  key={request._id}
                  className="card card-border bg-base-200"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {request.recipient?.name}
                        </h3>
                        {request.recipient?.role && (
                          <p className="text-sm opacity-70">
                            {request.recipient.role}
                          </p>
                        )}
                        {request.message && (
                          <p className="text-sm mt-2 opacity-80">
                            {request.message}
                          </p>
                        )}
                        {request.location && (
                          <p className="text-sm mt-1 opacity-70 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {request.location}
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
  request,
}: {
  request: {
    _id: Id<"meetingRequests">;
    requester: { name: string; role?: string } | null;
    message?: string;
    location?: string;
    proposedTime?: number;
    proposedDuration?: number;
  };
}) {
  const respondToRequest = useMutation(api.meetings.respondToRequest);
  const [isResponding, setIsResponding] = useState(false);

  const handleRespond = async (accept: boolean) => {
    setIsResponding(true);
    try {
      await respondToRequest({
        requestId: request._id,
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
            <h3 className="font-semibold">{request.requester?.name}</h3>
            {request.requester?.role && (
              <p className="text-sm opacity-70">{request.requester.role}</p>
            )}
            {request.message && (
              <p className="text-sm mt-2 opacity-80">{request.message}</p>
            )}
            <div className="mt-2 space-y-1">
              {request.proposedTime && (
                <p className="text-sm opacity-70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(request.proposedTime).toLocaleString()}
                </p>
              )}
              {request.location && (
                <p className="text-sm opacity-70 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {request.location}
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
