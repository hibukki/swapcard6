import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SharedMeetingsList } from "../components/SharedMeetingsList";
import { UserProfileCard } from "../components/UserProfileCard";

export const Route = createFileRoute("/user/$userId")({
  loader: async ({ context: { queryClient }, params }) => {
    const userQuery = convexQuery(api.users.get, {
      userId: params.userId as Id<"users">,
    });
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(userQuery);
    }
  },
  component: UserPage,
});

function UserPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();

  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.get, { userId: userId as Id<"users"> })
  );

  const sharedMeetings = useQuery(api.meetings.listSharedWith, {
    userId: userId as Id<"users">,
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="opacity-70 mb-6">This user profile doesn't exist or has been removed.</p>
        <Link to="/attendees" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Attendees
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/attendees" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Attendees
        </Link>
      </div>

      <div className="space-y-6">
        <UserProfileCard
          user={user}
          onRequestMeeting={() => void navigate({ to: "/attendees", search: { q: user.name } })}
        />
        {sharedMeetings && (
          <SharedMeetingsList
            meetings={sharedMeetings}
            onMeetingClick={(meetingId) => void navigate({ to: "/meeting/$meetingId", params: { meetingId } })}
          />
        )}
      </div>
    </div>
  );
}
