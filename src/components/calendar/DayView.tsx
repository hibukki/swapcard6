import { Fragment } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  isToday,
} from "@/types/calendar";
import { CalendarEvent } from "./CalendarEvent";

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
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

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
        {hours.map((hour) => {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          const slotMeetings = meetings.filter((calendarMeeting) => {
            const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
            const meetingEnd = new Date(
              calendarMeeting.meeting.scheduledTime + calendarMeeting.meeting.duration * 60000
            );
            return meetingStart < slotEnd && meetingEnd > slotStart;
          });

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

          return (
            <Fragment key={`row-${hour}`}>
              <div className="bg-background border-b border-border p-2 text-xs text-right text-muted-foreground">
                {hour === 0 || hour === 12
                  ? "12"
                  : hour > 12
                    ? hour - 12
                    : hour}
                {hour < 12 ? " AM" : " PM"}
              </div>

              <div className="border-b border-l border-border min-h-[80px] relative">
                <div
                  className={`absolute inset-x-0 top-0 h-1/2 ${
                    isEditingAvailability
                      ? "cursor-pointer hover:bg-destructive/10 transition-colors"
                      : ""
                  }`}
                  onClick={() => handleHalfHourClick(false)}
                />
                <div
                  className={`absolute inset-x-0 bottom-0 h-1/2 border-t border-border/40 ${
                    isEditingAvailability
                      ? "cursor-pointer hover:bg-destructive/10 transition-colors"
                      : ""
                  }`}
                  onClick={() => handleHalfHourClick(true)}
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
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
