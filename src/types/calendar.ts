import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Plain user info for calendar views (Convex-free for testability)
 */
export interface CalendarUser {
  id: string;
  name: string;
}

export type CalendarParticipantsMap = Record<string, string[]>;

/**
 * Participant summary for a meeting - used to determine display style
 */
export interface ParticipantSummary {
  acceptedCount: number;
  pendingCount: number;
  declinedCount: number;
  totalInvited: number; // excludes creator
}

/**
 * A meeting enriched with UI-specific display information for the calendar view.
 * Uses composition: contains the actual meeting document plus derived UI state.
 */
export interface CalendarMeetingView {
  meeting: Doc<"meetings">;

  /** The user's relationship to this meeting */
  userStatus: {
    /** User's participation status, if any */
    participationStatus?: "creator" | "accepted" | "pending" | "declined";
    /** True if this is a pending request (either incoming or outgoing) */
    isPendingRequest: boolean;
    /** True if the current user sent this request (vs received it) */
    isOutgoing: boolean;
  };

  /** Summary of other participants' responses */
  participantSummary?: ParticipantSummary;

  /** Display hints for calendar styling */
  display: {
    /** Category for color-coding in calendar views */
    category: CalendarDisplayCategory;
  };
}

/**
 * Display categories for calendar events:
 * - going: User is attending (creator or accepted invitation)
 * - not-responded: User has a pending invitation
 * - declined: User explicitly declined
 * - all-rejected: Creator's meeting where all invitees declined
 * - public-available: Public event user hasn't joined
 * - busy: User's availability block (solo event with no title)
 * - other: Fallback for edge cases
 */
export type CalendarDisplayCategory =
  | "going"
  | "not-responded"
  | "declined"
  | "all-rejected"
  | "public-available"
  | "busy"
  | "other";

/**
 * Checks if a meeting is a "busy" event (availability block).
 * A busy event is a private meeting with no title and only the creator as participant.
 */
export function isBusyEvent(
  meeting: Doc<"meetings">,
  participantSummary?: ParticipantSummary
): boolean {
  return (
    meeting.title === "" &&
    !meeting.isPublic &&
    (!participantSummary || participantSummary.totalInvited === 0)
  );
}

/**
 * Determines the display category for a meeting based on user's relationship to it.
 */
export function getMeetingDisplayCategory(
  meeting: Doc<"meetings">,
  participationStatus: "creator" | "accepted" | "pending" | "declined" | undefined,
  participantSummary?: ParticipantSummary
): CalendarDisplayCategory {
  // Check for busy event first (creator's availability block)
  if (
    participationStatus === "creator" &&
    isBusyEvent(meeting, participantSummary)
  ) {
    return "busy";
  }
  // User explicitly declined
  if (participationStatus === "declined") {
    return "declined";
  }

  // User is going (creator or accepted)
  if (participationStatus === "creator" || participationStatus === "accepted") {
    // Check if creator and all invitees declined
    if (
      participationStatus === "creator" &&
      participantSummary &&
      participantSummary.totalInvited > 0 &&
      participantSummary.declinedCount === participantSummary.totalInvited
    ) {
      return "all-rejected";
    }
    return "going";
  }

  // User hasn't responded (pending invitation)
  if (participationStatus === "pending") {
    return "not-responded";
  }

  // Public meeting user hasn't joined
  if (meeting.isPublic && !participationStatus) {
    return "public-available";
  }

  // Fallback
  return "other";
}

/**
 * Maps display category to Tailwind classes for calendar grid styling.
 */
export const categoryStyles: Record<
  CalendarDisplayCategory,
  {
    bg: string;
    border: string;
    text: string;
    strikethrough?: boolean;
    warningIcon?: boolean;
  }
> = {
  going: {
    bg: "bg-success/20",
    border: "border-success",
    text: "text-success",
  },
  "not-responded": {
    bg: "bg-success/10",
    border: "border-success",
    text: "text-foreground",
  },
  declined: {
    bg: "bg-muted",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground",
    strikethrough: true,
  },
  "all-rejected": {
    bg: "bg-warning/10",
    border: "border-warning",
    text: "text-muted-foreground",
    strikethrough: true,
    warningIcon: true,
  },
  "public-available": {
    bg: "bg-info/20",
    border: "border-info",
    text: "text-foreground",
  },
  busy: {
    bg: "bg-destructive/20",
    border: "border-destructive",
    text: "text-destructive",
  },
  other: {
    bg: "bg-warning/20",
    border: "border-warning",
    text: "text-foreground",
  },
};

/**
 * Generate tooltip text for a calendar event
 */
export function getEventTooltip(
  calendarMeeting: CalendarMeetingView,
  creatorName?: string,
  isEditingAvailability?: boolean
): string {
  const { display, userStatus, meeting } = calendarMeeting;

  switch (display.category) {
    case "going":
      return `Going: ${meeting.title}`;
    case "not-responded":
      return `Invitation from ${creatorName ?? "Unknown"}: ${meeting.title}`;
    case "declined":
      return `Declined: ${meeting.title}`;
    case "all-rejected":
      return `All invitees declined: ${meeting.title}`;
    case "public-available":
      return `Public event: ${meeting.title}`;
    case "busy":
      return isEditingAvailability ? "Busy (click to remove)" : "Busy";
    case "other":
      return userStatus.isOutgoing
        ? `Sent request: ${meeting.title}`
        : meeting.title;
  }
}

/**
 * Get the display title for a calendar event.
 * Uses event title if available, otherwise shows participant names.
 */
export function getEventDisplayTitle(
  calendarMeeting: CalendarMeetingView,
  usersMap: Map<string, CalendarUser>,
  participantUserIds: CalendarParticipantsMap
): string {
  const { meeting } = calendarMeeting;

  if (calendarMeeting.display.category === "busy") {
    return "Busy";
  }

  if (meeting.title && !meeting.title.startsWith("Meeting Request")) {
    return meeting.title;
  }

  const otherParticipantIds = participantUserIds[meeting._id] ?? [];
  if (otherParticipantIds.length > 0) {
    const names = otherParticipantIds
      .map((id) => usersMap.get(id)?.name)
      .filter(Boolean);
    if (names.length > 0) {
      return names.length <= 2 ? names.join(" & ") : `${names[0]} +${names.length - 1}`;
    }
  }

  if (calendarMeeting.userStatus.participationStatus !== "creator") {
    const creatorName = usersMap.get(meeting.creatorId)?.name;
    if (creatorName) return creatorName;
  }

  return meeting.title || "Meeting";
}

/**
 * Convert Convex user documents to plain CalendarUser map
 */
export function toCalendarUsersMap(
  users: Doc<"users">[]
): Map<string, CalendarUser> {
  return new Map(
    users.map((u) => [u._id, { id: u._id, name: u.name ?? "Unknown" }])
  );
}

/**
 * Convert Convex participant IDs map to plain string map
 */
export function toCalendarParticipantsMap(
  participantIds: Record<Id<"meetings">, Id<"users">[]>
): CalendarParticipantsMap {
  const result: CalendarParticipantsMap = {};
  for (const [meetingId, userIds] of Object.entries(participantIds)) {
    result[meetingId] = userIds;
  }
  return result;
}

export function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
