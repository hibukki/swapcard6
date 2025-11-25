import { Doc } from "./_generated/dataModel";

interface MeetingWithDetails {
  meeting: Doc<"meetings">;
  creatorName: string;
}

function formatICSDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateVEvent(item: MeetingWithDetails): string {
  const { meeting, creatorName } = item;
  const startTime = formatICSDate(meeting.scheduledTime);
  const endTime = formatICSDate(meeting.scheduledTime + meeting.duration * 60 * 1000);

  const lines = [
    "BEGIN:VEVENT",
    `UID:meeting-${meeting._id}@swapcard`,
    `DTSTAMP:${formatICSDate(Date.now())}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${escapeICSText(meeting.title)}`,
  ];

  if (meeting.description) {
    lines.push(`DESCRIPTION:${escapeICSText(meeting.description)}`);
  }

  if (meeting.location) {
    lines.push(`LOCATION:${escapeICSText(meeting.location)}`);
  }

  lines.push(`ORGANIZER;CN=${escapeICSText(creatorName)}:mailto:noreply@swapcard.local`);
  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

export function generateICSFeed(meetings: MeetingWithDetails[]): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SwapCard//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SwapCard Meetings",
  ].join("\r\n");

  const events = meetings.map(generateVEvent).join("\r\n");

  const footer = "END:VCALENDAR";

  if (meetings.length === 0) {
    return `${header}\r\n${footer}`;
  }

  return `${header}\r\n${events}\r\n${footer}`;
}
