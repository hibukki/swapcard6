import type { CalendarMeetingView } from "@/types/calendar";

export const CALENDAR_HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export function formatHour(hour: number): string {
  const displayHour = hour === 0 || hour === 12 ? "12" : hour > 12 ? String(hour - 12) : String(hour);
  const period = hour < 12 ? " AM" : " PM";
  return displayHour + period;
}

export function getMeetingsInSlot(
  meetings: CalendarMeetingView[],
  slotStart: Date,
  slotEnd: Date
): CalendarMeetingView[] {
  return meetings.filter((calendarMeeting) => {
    const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
    const meetingEnd = new Date(
      calendarMeeting.meeting.scheduledTime + calendarMeeting.meeting.duration * 60000
    );
    return meetingStart < slotEnd && meetingEnd > slotStart;
  });
}
