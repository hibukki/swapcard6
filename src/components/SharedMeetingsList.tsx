import { Calendar } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";

interface SharedMeetingsListProps {
  meetings: Doc<"meetings">[];
  onMeetingClick?: (meetingId: Id<"meetings">) => void;
}

export function SharedMeetingsList({
  meetings,
  onMeetingClick,
}: SharedMeetingsListProps) {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Shared Meetings ({meetings.length})
        </h3>
        <div className="space-y-2">
          {meetings.map((meeting) => (
            <button
              key={meeting._id}
              type="button"
              onClick={() => onMeetingClick?.(meeting._id)}
              className="block w-full text-left p-3 bg-muted rounded-lg hover:bg-accent transition-colors"
            >
              <div className="font-semibold">{meeting.title}</div>
              <div className="text-sm text-muted-foreground">
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
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
