import type { Id } from "../../../convex/_generated/dataModel";
import type {
  CalendarMeetingView,
  CalendarUser,
  CalendarParticipantsMap,
} from "@/types/calendar";
import { CalendarEvent } from "./CalendarEvent";
import { formatHour } from "./calendarUtils";

type SlotHeight = "60px" | "80px" | "100px";

interface TimeSlotProps {
  slotStart: Date;
  slotMeetings: CalendarMeetingView[];
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
  isEditingAvailability: boolean;
  onCreateBusy: (scheduledTime: number, durationMinutes: number) => void;
  onDeleteBusy: (meetingId: Id<"meetings">) => void;
  hour: number;
  minHeight?: SlotHeight;
}

export function TimeSlot({
  slotStart,
  slotMeetings,
  usersMap,
  participantUserIds,
  onMeetingClick,
  isEditingAvailability,
  onCreateBusy,
  onDeleteBusy,
  hour,
  minHeight = "60px",
}: TimeSlotProps) {
  const hasBusyEventInHalfHour = (isBottomHalf: boolean) => {
    const halfStart = new Date(slotStart);
    if (isBottomHalf) halfStart.setMinutes(30);
    const halfEnd = new Date(halfStart.getTime() + 30 * 60000);

    return slotMeetings.some((m) => {
      if (m.display.category !== "busy") return false;
      const meetingStart = m.meeting.scheduledTime;
      const meetingEnd = meetingStart + m.meeting.duration * 60000;
      return meetingStart < halfEnd.getTime() && meetingEnd > halfStart.getTime();
    });
  };

  const handleHalfHourClick = (isBottomHalf: boolean) => {
    if (isEditingAvailability && !hasBusyEventInHalfHour(isBottomHalf)) {
      const slotTime = new Date(slotStart);
      if (isBottomHalf) {
        slotTime.setMinutes(30);
      }
      onCreateBusy(slotTime.getTime(), 30);
    }
  };

  const handleKeyDown = (isBottomHalf: boolean) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHalfHourClick(isBottomHalf);
    }
  };

  const getSlotLabel = (isBottomHalf: boolean) => {
    const minutes = isBottomHalf ? "30" : "00";
    return `Mark ${formatHour(hour).replace(" ", "")}:${minutes} as busy`;
  };

  return (
    <div className={`border-b border-l border-border relative`} style={{ minHeight }}>
      <div
        role={isEditingAvailability ? "button" : undefined}
        tabIndex={isEditingAvailability ? 0 : undefined}
        aria-label={isEditingAvailability ? getSlotLabel(false) : undefined}
        className={`absolute inset-x-0 top-0 h-1/2 ${
          isEditingAvailability
            ? "cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none transition-colors"
            : ""
        }`}
        onClick={() => handleHalfHourClick(false)}
        onKeyDown={isEditingAvailability ? handleKeyDown(false) : undefined}
      />
      <div
        role={isEditingAvailability ? "button" : undefined}
        tabIndex={isEditingAvailability ? 0 : undefined}
        aria-label={isEditingAvailability ? getSlotLabel(true) : undefined}
        className={`absolute inset-x-0 bottom-0 h-1/2 border-t border-border/40 ${
          isEditingAvailability
            ? "cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none transition-colors"
            : ""
        }`}
        onClick={() => handleHalfHourClick(true)}
        onKeyDown={isEditingAvailability ? handleKeyDown(true) : undefined}
      />
      {slotMeetings.map((calendarMeeting) => {
        const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
        const isFirstSlot = meetingStart.getHours() === hour;

        if (!isFirstSlot) return null;

        const isBusy = calendarMeeting.display.category === "busy";
        const startsAtHalfHour = meetingStart.getMinutes() >= 30;
        const durationMinutes = calendarMeeting.meeting.duration;
        const heightPercent = Math.min((durationMinutes / 60) * 100, 100);
        const isNonBusyInEditMode = isEditingAvailability && !isBusy;

        const handleCardClick = () => {
          if (isEditingAvailability && isBusy) {
            onDeleteBusy(calendarMeeting.meeting._id);
          } else if (!isEditingAvailability) {
            onMeetingClick(calendarMeeting);
          }
        };

        return (
          <div
            key={calendarMeeting.meeting._id}
            className={`absolute left-1 right-1 ${isNonBusyInEditMode ? "pointer-events-none" : ""}`}
            style={{
              top: startsAtHalfHour ? "50%" : "4px",
              height: `calc(${heightPercent}% - 8px)`,
            }}
          >
            <CalendarEvent
              calendarMeeting={calendarMeeting}
              usersMap={usersMap}
              participantUserIds={participantUserIds}
              onClick={handleCardClick}
              dimmed={isNonBusyInEditMode}
              isEditingAvailability={isEditingAvailability}
            />
          </div>
        );
      })}
    </div>
  );
}
