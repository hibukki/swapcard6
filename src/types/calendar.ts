import type { Doc } from "../../convex/_generated/dataModel";

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

  /** Display hints for calendar styling */
  display: {
    /** Category for color-coding in calendar views */
    category: "my-private" | "my-public" | "public-available" | "pending-incoming" | "pending-outgoing";
  };
}

/**
 * Determines the display category for a meeting based on user's relationship to it.
 */
export function getMeetingDisplayCategory(
  meeting: Doc<"meetings">,
  participationStatus: "creator" | "accepted" | "pending" | "declined" | undefined,
  isOutgoing: boolean
): CalendarMeetingView["display"]["category"] {
  // Pending requests get special treatment
  if (participationStatus === "pending") {
    return "pending-incoming";
  }
  if (participationStatus === "creator" && !meeting.isPublic) {
    // Check if it's a private meeting I created that's awaiting response
    // This is determined by the isOutgoing flag passed in
    if (isOutgoing) {
      return "pending-outgoing";
    }
  }

  // Regular meetings
  const isParticipant = participationStatus === "creator" || participationStatus === "accepted";

  if (isParticipant) {
    return meeting.isPublic ? "my-public" : "my-private";
  }

  return "public-available";
}

/**
 * Maps display category to Tailwind classes for calendar grid styling.
 */
export const categoryStyles: Record<CalendarMeetingView["display"]["category"], {
  bg: string;
  border: string;
  text: string;
}> = {
  "my-private": {
    bg: "bg-primary/20",
    border: "border-primary",
    text: "text-primary-content",
  },
  "my-public": {
    bg: "bg-success/20",
    border: "border-success",
    text: "text-success-content",
  },
  "public-available": {
    bg: "bg-secondary/20",
    border: "border-secondary",
    text: "text-secondary-content",
  },
  "pending-incoming": {
    bg: "bg-warning/20",
    border: "border-warning",
    text: "text-warning-content",
  },
  "pending-outgoing": {
    bg: "bg-warning/20",
    border: "border-warning",
    text: "text-warning-content",
  },
};
