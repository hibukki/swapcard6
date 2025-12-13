import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MeetingCard } from "@/components/MeetingCard";
import { CreatePublicMeetingModal } from "@/components/CreatePublicMeetingModal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/EmptyState";

const myParticipationsQuery = convexQuery(
  api.meetingParticipants.listMeetingsForCurrentUser,
  {},
);

export const Route = createFileRoute("/conference/$conferenceId/public-meetings")({
  loader: async ({ context: { queryClient }, params }) => {
    if ((window as any).Clerk?.session) {
      const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {
        conferenceId: params.conferenceId as Id<"conferences">,
      });
      await Promise.all([
        queryClient.ensureQueryData(publicMeetingsQuery),
        queryClient.ensureQueryData(myParticipationsQuery),
      ]);
    }
  },
  component: PublicMeetingsPage,
});

function PublicMeetingsPage() {
  const { conferenceId } = Route.useParams();
  const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {
    conferenceId: conferenceId as Id<"conferences">,
  });
  const { data: meetings } = useSuspenseQuery(publicMeetingsQuery);
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Build map of meetingId -> user's status
  const statusByMeetingId = useMemo(() => {
    const map = new Map<
      Id<"meetings">,
      "creator" | "accepted" | "pending" | "declined"
    >();
    for (const p of myParticipations) {
      map.set(p.meetingId, p.status);
    }
    return map;
  }, [myParticipations]);

  // Separate upcoming and past meetings
  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => m.scheduledTime >= now);
  const pastMeetings = meetings.filter((m) => m.scheduledTime < now);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Button className="not-prose mt-4" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Public Meeting
        </Button>
      </div>

      <div className="not-prose mt-8 space-y-8">
        {/* Upcoming Public Meetings */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length === 0 ? (
            <EmptyState description="No upcoming public meetings" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  userStatus={statusByMeetingId.get(meeting._id)}
                  variant="compact"
                  showMeetingLink
                />
              ))}
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
            <div className="grid gap-4 md:grid-cols-2 opacity-60">
              {pastMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  userStatus={statusByMeetingId.get(meeting._id)}
                  variant="compact"
                  showActions={false}
                  showMeetingLink
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create Public Meeting Modal */}
      <CreatePublicMeetingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
