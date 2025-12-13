import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ChatEmbed } from "../../../components/chat/ChatEmbed";
import { SharedMeetingsList } from "../../../components/SharedMeetingsList";
import { UserProfileCard } from "../../../components/UserProfileCard";
import { Button } from "@/components/ui/button";
import { useConference } from "@/contexts/ConferenceContext";

const attendeeSearchSchema = z.object({
  chat: z.enum(["focus"]).optional(),
});

export const Route = createFileRoute(
  "/conference/$conferenceId/attendee/$userId"
)({
  validateSearch: attendeeSearchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    const userQuery = convexQuery(api.users.get, {
      userId: params.userId as Id<"users">,
    });
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(userQuery);
    }
  },
  component: AttendeePage,
});

function AttendeePage() {
  const { userId, conferenceId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const conference = useConference();

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
        <p className="text-muted-foreground mb-6">
          This user profile doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link
            to="/conference/$conferenceId/attendees"
            params={{ conferenceId }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Attendees
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/conference/$conferenceId/attendees"
            params={{ conferenceId }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Attendees
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <UserProfileCard
          user={user}
          onRequestMeeting={() =>
            void navigate({
              to: "/conference/$conferenceId/attendees",
              params: { conferenceId },
              search: { requestMeeting: userId },
            })
          }
        />
        {sharedMeetings && (
          <SharedMeetingsList
            meetings={sharedMeetings}
            onMeetingClick={(meetingId) =>
              void navigate({
                to: "/conference/$conferenceId/meeting/$meetingId",
                params: { conferenceId, meetingId },
              })
            }
          />
        )}
        <div className="not-prose">
          <ChatEmbed
            otherUserId={userId as Id<"users">}
            autoFocus={search.chat === "focus"}
          />
        </div>
      </div>
    </div>
  );
}
