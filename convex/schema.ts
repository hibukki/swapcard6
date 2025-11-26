import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable field validators
export const conferenceFields = {
  name: v.string(),
  description: v.optional(v.string()),
  startDate: v.number(), // UTC timestamp
  endDate: v.number(), // UTC timestamp
  timezone: v.string(), // IANA timezone (e.g., "America/New_York") for display
  location: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
};

export const meetingFields = {
  title: v.string(),
  description: v.optional(v.string()),
  scheduledTime: v.number(), // UTC timestamp
  duration: v.number(), // in minutes
  location: v.optional(v.string()),
  isPublic: v.boolean(),
  maxParticipants: v.optional(v.number()),
  notes: v.optional(v.string()),
};

// Reusable enum validators
export const conferenceAttendeeRoleValidator = v.union(
  v.literal("organizer"),
  v.literal("speaker"),
  v.literal("attendee"),
);
export type ConferenceAttendeeRole = "organizer" | "speaker" | "attendee";

export const meetingParticipantStatusValidator = v.union(
  v.literal("creator"),
  v.literal("accepted"),
  v.literal("pending"),
  v.literal("declined"),
);
export type MeetingParticipantStatus = "creator" | "accepted" | "pending" | "declined";

export const notificationTypeValidator = v.union(
  v.literal("meeting_request"),
  v.literal("meeting_accepted"),
  v.literal("meeting_declined"),
  v.literal("meeting_cancelled"),
  v.literal("meeting_reminder"),
  v.literal("conference_announcement"),
);
export type NotificationType =
  | "meeting_request"
  | "meeting_accepted"
  | "meeting_declined"
  | "meeting_cancelled"
  | "meeting_reminder"
  | "conference_announcement";

export default defineSchema({
  conferences: defineTable({
    ...conferenceFields,
    createdBy: v.id("users"),
  })
    .index("by_start_date", ["startDate"])
    .index("by_name", ["name"]),

  conferenceAttendees: defineTable({
    conferenceId: v.id("conferences"),
    userId: v.id("users"),
    role: conferenceAttendeeRoleValidator,
  })
    .index("by_conference", ["conferenceId"])
    .index("by_user", ["userId"])
    .index("by_conference_and_user", ["conferenceId", "userId"]),

  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    canHelpWith: v.optional(v.string()),
    needsHelpWith: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    calendarToken: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_name", ["name"])
    .index("by_calendarToken", ["calendarToken"]),

  meetings: defineTable({
    ...meetingFields,
    creatorId: v.id("users"),
    conferenceId: v.optional(v.id("conferences")),
  })
    .index("by_creator", ["creatorId", "scheduledTime"])
    .index("by_time", ["scheduledTime"])
    .index("by_public", ["isPublic", "scheduledTime"])
    .index("by_title_public", ["title", "isPublic"])
    .index("by_conference", ["conferenceId", "scheduledTime"]),

  meetingParticipants: defineTable({
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    status: meetingParticipantStatusValidator,
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId", "meetingId"])
    .index("by_user_only", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.optional(v.string()),
    relatedMeetingId: v.optional(v.id("meetings")),
    relatedConferenceId: v.optional(v.id("conferences")),
    relatedUserId: v.optional(v.id("users")),
    isRead: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),
});
