import { Link } from "@tanstack/react-router";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { Clock, MapPin } from "lucide-react";
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
      <div className="flex items-center gap-1 text-sm text-gray-300 mt-1">
        <Clock className="w-3 h-3" />
        <ShortDate timestamp={meeting.scheduledTime} />
      </div>
      {meeting.location && (
        <div className="flex items-center gap-1 text-sm text-gray-300">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{meeting.location}</span>
        </div>
      )}
      {meeting.description && (
        <p className="mt-2 text-sm text-gray-300 line-clamp-2">
          {meeting.description}
        </p>
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
