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
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);
  const isTodayDate = isToday(currentDate);

  return (
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="grid grid-cols-[auto_1fr] min-w-[400px]">
        <div className="sticky top-0 bg-muted border-b border-border p-2 text-center text-sm font-semibold z-10"></div>

        <div
          className={`sticky top-0 bg-muted border-b border-l border-border p-2 text-center text-sm z-10 ${
            isTodayDate ? "text-primary font-bold" : ""
          }`}
        >
          <div>
            {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <div
            className={`text-2xl ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-8 h-8 mx-auto flex items-center justify-center" : ""}`}
          >
            {currentDate.getDate()}
          </div>
        </div>

        {hours.map((hour) => {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          const slotMeetings = meetings.filter((calendarMeeting) => {
            const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
            const meetingEnd = new Date(
              calendarMeeting.meeting.scheduledTime +
                calendarMeeting.meeting.duration * 60000
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
              return (
                meetingStart < halfEnd.getTime() &&
                meetingEnd > halfStart.getTime()
              );
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
              <div
                key={`time-${hour}`}
                className="bg-background border-b border-border p-2 text-xs text-right text-muted-foreground sticky left-0 w-16"
              >
                {hour === 0 || hour === 12 ? "12" : hour > 12 ? hour - 12 : hour}
                {hour < 12 ? " AM" : " PM"}
              </div>

              <div className="border-b border-l border-border min-h-[60px] relative">
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
                  const meetingStart = new Date(
                    calendarMeeting.meeting.scheduledTime
                  );
                  const isFirstSlot = meetingStart.getHours() === hour;

                  if (!isFirstSlot) return null;

                  const isBusy = calendarMeeting.display.category === "busy";
                  const startsAtHalfHour = meetingStart.getMinutes() >= 30;
                  const durationMinutes = calendarMeeting.meeting.duration;
                  const heightPercent = (durationMinutes / 60) * 100;
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
