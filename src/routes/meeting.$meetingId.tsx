import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MeetingCard } from "../components/MeetingCard";

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

  const { data: meeting } = useSuspenseQuery(
    convexQuery(api.meetings.get, { meetingId: meetingId as Id<"meetings"> })
  );

  const myParticipation = useQuery(api.meetingParticipants.getCurrentUserParticipation, {
    meetingId: meetingId as Id<"meetings">,
  });

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/calendar" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </Link>
      </div>

      <MeetingCard
        meeting={meeting}
        userStatus={myParticipation?.status}
        variant="full"
        showParticipants
        showActions
      />
    </div>
  );
}
