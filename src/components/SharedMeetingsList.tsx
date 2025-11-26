import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface SharedMeetingsListProps {
  meetings: Doc<"meetings">[];
}

export function SharedMeetingsList({ meetings }: SharedMeetingsListProps) {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Shared Meetings ({meetings.length})
        </h3>
        <div className="space-y-2">
          {meetings.map((meeting) => (
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
    </div>
  );
}
