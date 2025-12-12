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

export interface WeekViewProps {
  meetings: CalendarMeetingView[];
  currentDate: Date;
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
  isEditingAvailability: boolean;
  onCreateBusy: (scheduledTime: number, durationMinutes: number) => void;
  onDeleteBusy: (meetingId: Id<"meetings">) => void;
}

export function WeekView({
  meetings,
  currentDate,
  usersMap,
  participantUserIds,
  onMeetingClick,
  isEditingAvailability,
  onCreateBusy,
  onDeleteBusy,
}: WeekViewProps) {
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="grid grid-cols-8 min-w-[800px]">
        <div className="sticky top-0 bg-muted border-b border-border p-2 text-center text-sm font-semibold z-10"></div>

        {weekDays.map((date, i) => {
          const isTodayDate = isToday(date);
          return (
            <div
              key={i}
              className={`sticky top-0 bg-muted border-b border-l border-border p-2 text-center text-sm z-10 ${
                isTodayDate ? "text-primary font-bold" : ""
              }`}
            >
              <div>
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-2xl ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-8 h-8 mx-auto flex items-center justify-center" : ""}`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}

        {CALENDAR_HOURS.map((hour) => (
          <Fragment key={`row-${hour}`}>
            <div
              key={`time-${hour}`}
              className="bg-background border-b border-border p-2 text-xs text-right text-muted-foreground sticky left-0"
            >
              {formatHour(hour)}
            </div>

            {weekDays.map((date, dayIndex) => {
              const slotStart = new Date(date);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(date);
              slotEnd.setHours(hour + 1, 0, 0, 0);

              const slotMeetings = getMeetingsInSlot(meetings, slotStart, slotEnd);

              return (
                <TimeSlot
                  key={`${hour}-${dayIndex}`}
                  slotStart={slotStart}
                  slotMeetings={slotMeetings}
                  usersMap={usersMap}
                  participantUserIds={participantUserIds}
                  onMeetingClick={onMeetingClick}
                  isEditingAvailability={isEditingAvailability}
                  onCreateBusy={onCreateBusy}
                  onDeleteBusy={onDeleteBusy}
                  hour={hour}
                  minHeight="60px"
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
