import { Fragment } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  isToday,
} from "@/types/calendar";
import { TimeSlot } from "./TimeSlot";
import { CALENDAR_HOURS, formatHour, getMeetingsInSlot } from "./calendarUtils";

export interface DayViewProps {
  meetings: CalendarMeetingView[];
  currentDate: Date;
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
  isEditingAvailability: boolean;
  onCreateBusy: (scheduledTime: number, durationMinutes: number) => void;
  onDeleteBusy: (meetingId: Id<"meetings">) => void;
}

export function DayView({
  meetings,
  currentDate,
  usersMap,
  participantUserIds,
  onMeetingClick,
  isEditingAvailability,
  onCreateBusy,
  onDeleteBusy,
}: DayViewProps) {
  const isTodayDate = isToday(currentDate);

  return (
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="sticky top-0 bg-muted border-b border-border p-3 text-center z-10">
        <div className={`text-sm ${isTodayDate ? "text-primary font-bold" : ""}`}>
          {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
        <div
          className={`text-2xl ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-10 h-10 mx-auto flex items-center justify-center" : ""}`}
        >
          {currentDate.getDate()}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-[60px_1fr]">
        {CALENDAR_HOURS.map((hour) => {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          const slotMeetings = getMeetingsInSlot(meetings, slotStart, slotEnd);

          return (
            <Fragment key={`row-${hour}`}>
              <div className="bg-background border-b border-border p-2 text-xs text-right text-muted-foreground">
                {formatHour(hour)}
              </div>

              <TimeSlot
                slotStart={slotStart}
                slotMeetings={slotMeetings}
                usersMap={usersMap}
                participantUserIds={participantUserIds}
                onMeetingClick={onMeetingClick}
                isEditingAvailability={isEditingAvailability}
                onCreateBusy={onCreateBusy}
                onDeleteBusy={onDeleteBusy}
                hour={hour}
                minHeight="80px"
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
