import { Link } from "@tanstack/react-router";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ShortDate } from "./ShortDate";

interface MeetingNameProps {
  meeting: Doc<"meetings">;
  className?: string;
}

function MeetingPreviewCard({ meeting }: { meeting: Doc<"meetings"> }) {
  return (
    <div className="p-2 max-w-64 text-white">
      <div className="font-semibold truncate">{meeting.title}</div>
      <div className="text-sm text-gray-300">
        <ShortDate timestamp={meeting.scheduledTime} />
      </div>
      {meeting.description && (
        <p className="mt-1 text-sm text-gray-300 line-clamp-2">
          {meeting.description}
        </p>
      )}
      {meeting.location && (
        <div className="mt-1 text-xs text-gray-400">{meeting.location}</div>
      )}
    </div>
  );
}

export function MeetingName({ meeting, className }: MeetingNameProps) {
  return (
    <Tippy
      content={<MeetingPreviewCard meeting={meeting} />}
      delay={[200, 0]}
      interactive
      appendTo={() => document.body}
    >
      <Link
        to="/meeting/$meetingId"
        params={{ meetingId: meeting._id }}
        className={cn(
          "font-semibold text-primary hover:underline underline-offset-4",
          className
        )}
      >
        {meeting.title}
      </Link>
    </Tippy>
  );
}
