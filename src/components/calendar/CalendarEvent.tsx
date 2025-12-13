import { Link } from "@tanstack/react-router";
import Tippy from "@tippyjs/react";
import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  categoryStyles,
  getEventTooltip,
  getEventDisplayTitle,
  formatTime,
} from "@/types/calendar";

export interface CalendarEventProps {
  calendarMeeting: CalendarMeetingView;
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onClick: () => void;
  dimmed?: boolean;
  isEditingAvailability?: boolean;
  variant?: "default" | "compact";
}

export function CalendarEvent({
  calendarMeeting,
  usersMap,
  participantUserIds,
  onClick,
  dimmed = false,
  isEditingAvailability = false,
  variant = "default",
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
  const isCompact = variant === "compact";

  const baseClasses = `border-l-4 ${styles.border} p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${styles.bg} ${dimmed ? "opacity-40" : ""}`;

  const cardContent = isCompact ? (
    <div
      className={`${baseClasses} truncate`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={isEditableBusy ? undefined : tooltip}
    >
      <span className={`${styles.text} ${styles.strikethrough ? "line-through" : ""}`}>
        {styles.warningIcon && "⚠️ "}
        {formatTime(startTime)} {displayTitle}
      </span>
    </div>
  ) : (
    <div
      className={`${baseClasses} h-full overflow-hidden`}
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
          to="/conference/$conferenceId/meeting/$meetingId"
          params={{ conferenceId: meeting.conferenceId, meetingId: meeting._id }}
          className={`font-semibold ${styles.text} truncate block hover:underline ${styles.strikethrough ? "line-through" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {styles.warningIcon && "⚠️ "}
          {displayTitle}
        </Link>
      )}
      <div className="text-muted-foreground">
        {formatTime(startTime)} - {formatTime(endTime)}
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
