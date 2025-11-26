import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Building2, Briefcase, Calendar, HandHelping, HelpCircle, Mail } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

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

      <div className="card bg-base-200">
        <div className="card-body">
          {/* Header with avatar and name */}
          <div className="flex items-start gap-4">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {(user.role || user.company) && (
                <p className="opacity-70">
                  {user.role}
                  {user.role && user.company && " at "}
                  {user.company}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <>
              <div className="divider"></div>
              <p className="whitespace-pre-wrap">{user.bio}</p>
            </>
          )}

          {/* Details */}
          <div className="divider"></div>
          <div className="space-y-3">
            {user.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 opacity-70" />
                <a href={`mailto:${user.email}`} className="link link-hover">
                  {user.email}
                </a>
              </div>
            )}

            {user.company && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 opacity-70" />
                <span>{user.company}</span>
              </div>
            )}

            {user.role && (
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 opacity-70" />
                <span>{user.role}</span>
              </div>
            )}

            {user.interests && user.interests.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="opacity-70 text-sm">Interests:</span>
                <div className="flex flex-wrap gap-1">
                  {user.interests.map((interest, i) => (
                    <span key={i} className="badge badge-sm badge-outline">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user.canHelpWith && (
              <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                <HandHelping className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-success">Can help with:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{user.canHelpWith}</p>
                </div>
              </div>
            )}

            {user.needsHelpWith && (
              <div className="flex items-start gap-3 p-3 bg-info/10 rounded-lg">
                <HelpCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-info">Looking for help with:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{user.needsHelpWith}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shared Meetings */}
          {sharedMeetings && sharedMeetings.length > 0 && (
            <>
              <div className="divider"></div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Shared Meetings ({sharedMeetings.length})
                </h3>
                <div className="space-y-2">
                  {sharedMeetings.map((meeting) => (
                    <Link
                      key={meeting._id}
                      to="/meeting/$meetingId"
                      params={{ meetingId: meeting._id }}
                      className="block p-3 bg-base-300 rounded-lg hover:bg-base-100 transition-colors"
                    >
                      <div className="font-semibold">{meeting.title}</div>
                      <div className="text-sm opacity-70">
                        {new Date(meeting.scheduledTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {meeting.duration} min
                        {meeting.location && ` · ${meeting.location}`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Request Meeting Button */}
          <div className="card-actions justify-end mt-6">
            <Link
              to="/attendees"
              search={{ q: user.name }}
              className="btn btn-primary"
            >
              Request a Meeting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
