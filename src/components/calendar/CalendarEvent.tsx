import { Link } from "@tanstack/react-router";
import Tippy from "@tippyjs/react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  categoryStyles,
  getEventTooltip,
  getEventDisplayTitle,
} from "@/types/calendar";

export interface CalendarEventProps {
  calendarMeeting: CalendarMeetingView;
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onClick: () => void;
  dimmed?: boolean;
  isEditingAvailability?: boolean;
}

export function CalendarEvent({
  calendarMeeting,
  usersMap,
  participantUserIds,
  onClick,
  dimmed = false,
  isEditingAvailability = false,
}: CalendarEventProps) {
  const { meeting, display } = calendarMeeting;
  const startTime = new Date(meeting.scheduledTime);
  const endTime = new Date(meeting.scheduledTime + meeting.duration * 60000);
  const styles = categoryStyles[display.category];
  const isBusy = display.category === "busy";
  const displayTitle = getEventDisplayTitle(calendarMeeting, usersMap, participantUserIds);
  const tooltip = getEventTooltip(
    calendarMeeting,
    usersMap.get(meeting.creatorId)?.name,
    isEditingAvailability
  );

  const isEditableBusy = isBusy && isEditingAvailability;

  const cardContent = (
    <div
      className={`border-l-4 ${styles.border} p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity h-full overflow-hidden ${styles.borderOnly ? "bg-background" : styles.bg} ${dimmed ? "opacity-40" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={isEditableBusy ? undefined : tooltip}
    >
      {isBusy ? (
        <div className={`font-semibold ${styles.text} truncate`}>
          {displayTitle}
        </div>
      ) : (
        <Link
          to="/meeting/$meetingId"
          params={{ meetingId: meeting._id as Id<"meetings"> }}
          className={`font-semibold ${styles.text} truncate block hover:underline ${styles.strikethrough ? "line-through" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {styles.warningIcon && "⚠️ "}
          {displayTitle}
        </Link>
      )}
      <div className="text-muted-foreground">
        {startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        -{" "}
        {endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>
    </div>
  );

  if (isEditableBusy) {
    return (
      <Tippy content={tooltip} delay={0}>
        {cardContent}
      </Tippy>
    );
  }

  return cardContent;
}
