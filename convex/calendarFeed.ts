import ical, {
  ICalAlarmType,
  ICalAttendeeRole,
  ICalAttendeeStatus,
  ICalCalendarMethod,
  ICalEventStatus,
} from "ical-generator";
import { Doc } from "./_generated/dataModel";

interface Attendee {
  name: string;
  email: string;
  status: "creator" | "accepted" | "pending" | "declined";
}

interface MeetingWithDetails {
  meeting: Doc<"meetings">;
  creatorName: string;
  creatorEmail: string;
  attendees: Attendee[];
}

const ALARM_MINUTES_BEFORE = 10;
const REFRESH_INTERVAL_SECONDS = 5 * 60;

interface FeedOptions {
  baseUrl?: string;
}

function formatLastUpdated(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z") + " (UTC)";
}

export function generateICSFeed(meetings: MeetingWithDetails[], options: FeedOptions = {}): string {
  const { baseUrl } = options;

  const calendar = ical({
    name: "OpenCon Meetings",
    prodId: { company: "OpenCon", product: "Calendar", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
    ttl: REFRESH_INTERVAL_SECONDS,
  });

  const lastUpdated = formatLastUpdated(new Date());
  const calendarUrl = baseUrl ? `${baseUrl}/calendar` : undefined;

  for (const { meeting, creatorName, creatorEmail, attendees } of meetings) {
    const meetingUrl = baseUrl ? `${baseUrl}/meeting/${meeting._id}` : undefined;

    const descriptionParts: string[] = [];
    if (meeting.description) {
      descriptionParts.push(meeting.description);
    }
    descriptionParts.push("");
    descriptionParts.push("---");
    if (meetingUrl) {
      descriptionParts.push(`View event: ${meetingUrl}`);
    }
    if (calendarUrl) {
      descriptionParts.push(`Your calendar: ${calendarUrl}`);
    }
    descriptionParts.push(`Last updated: ${lastUpdated}`);

    calendar.createEvent({
      id: `meeting-${meeting._id}@opencon`,
      start: new Date(meeting.scheduledTime),
      end: new Date(meeting.scheduledTime + meeting.duration * 60 * 1000),
      summary: meeting.title,
      description: descriptionParts.join("\n"),
      location: meeting.location ?? undefined,
      url: meetingUrl,
      status: ICalEventStatus.CONFIRMED,
      created: new Date(meeting._creationTime),
      lastModified: new Date(),
      organizer: { name: creatorName, email: creatorEmail },
      attendees: attendees.map((a) => ({
        name: a.name,
        email: a.email,
        role: ICalAttendeeRole.REQ,
        status: mapAttendeeStatus(a.status),
      })),
      alarms: [
        {
          type: ICalAlarmType.display,
          trigger: ALARM_MINUTES_BEFORE * 60,
          description: `${meeting.title} starts in ${ALARM_MINUTES_BEFORE} minutes`,
        },
      ],
    });
  }

  return calendar.toString();
}

function mapAttendeeStatus(
  status: Attendee["status"]
): ICalAttendeeStatus | undefined {
  switch (status) {
    case "creator":
    case "accepted":
      return ICalAttendeeStatus.ACCEPTED;
    case "pending":
      return ICalAttendeeStatus.NEEDSACTION;
    case "declined":
      return ICalAttendeeStatus.DECLINED;
  }
}
