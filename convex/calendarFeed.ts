import ical, { ICalCalendarMethod } from "ical-generator";
import { Doc } from "./_generated/dataModel";

interface MeetingWithDetails {
  meeting: Doc<"meetings">;
  creatorName: string;
}

export function generateICSFeed(meetings: MeetingWithDetails[]): string {
  const calendar = ical({
    name: "OpenCon Meetings",
    prodId: { company: "OpenCon", product: "Calendar", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
  });

  for (const { meeting, creatorName } of meetings) {
    calendar.createEvent({
      id: `meeting-${meeting._id}@opencon`,
      start: new Date(meeting.scheduledTime),
      end: new Date(meeting.scheduledTime + meeting.duration * 60 * 1000),
      summary: meeting.title,
      description: meeting.description ?? undefined,
      location: meeting.location ?? undefined,
      organizer: { name: creatorName, email: "noreply@opencon.local" },
    });
  }

  return calendar.toString();
}
