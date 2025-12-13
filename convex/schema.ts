import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

/** UTC timestamp in milliseconds since epoch */
export const utcTimestamp = v.number();
export type UtcTimestamp = number;

// Reusable field validators
export const conferenceFields = {
  name: v.string(),
  description: v.optional(v.string()),
  startDate: utcTimestamp,
  endDate: utcTimestamp,
  timezone: v.string(), // IANA timezone (e.g., "America/New_York") for display
  location: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
};

export const meetingFields = {
  title: v.string(),
  description: v.optional(v.string()),
  scheduledTime: utcTimestamp,
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

// Notification discriminated union - each type has required (non-optional) fields
const notificationBaseFields = {
  userId: v.id("users"), // recipient
  isRead: v.boolean(),
};

export const notificationValidator = v.union(
  v.object({
    ...notificationBaseFields,
    type: v.literal("meeting_request"),
    meetingId: v.id("meetings"),
    fromUserId: v.id("users"),
  }),
  v.object({
    ...notificationBaseFields,
    type: v.literal("meeting_accepted"),
    meetingId: v.id("meetings"),
    fromUserId: v.id("users"),
  }),
  v.object({
    ...notificationBaseFields,
    type: v.literal("meeting_declined"),
    meetingId: v.id("meetings"),
    fromUserId: v.id("users"),
  }),
  v.object({
    ...notificationBaseFields,
    type: v.literal("meeting_cancelled"),
    meetingId: v.id("meetings"),
    fromUserId: v.id("users"),
  }),
);

// Derived from validator - stays in sync automatically
export type Notification = Infer<typeof notificationValidator>;
export type NotificationType = Notification["type"];

// Args for createNotification helper - enforces correct fields per type
export type CreateNotificationArgs =
  | { userId: Notification["userId"]; type: "meeting_request"; meetingId: Notification["meetingId"]; fromUserId: Notification["fromUserId"] }
  | { userId: Notification["userId"]; type: "meeting_accepted"; meetingId: Notification["meetingId"]; fromUserId: Notification["fromUserId"] }
  | { userId: Notification["userId"]; type: "meeting_declined"; meetingId: Notification["meetingId"]; fromUserId: Notification["fromUserId"] }
  | { userId: Notification["userId"]; type: "meeting_cancelled"; meetingId: Notification["meetingId"]; fromUserId: Notification["fromUserId"] };

export const llmRateLimitWindowValidator = v.union(
  v.literal("minute"),
  v.literal("hour"),
  v.literal("day")
);
export type LlmRateLimitWindow = "minute" | "hour" | "day";

export default defineSchema({
  conferences: defineTable({
    ...conferenceFields,
    createdBy: v.id("users"),
  })
    .index("by_start_date", ["startDate"])
    .index("by_name", ["name"]),

  conferenceMeetingSpots: defineTable({
    conferenceId: v.id("conferences"),
    name: v.string(),
  })
    .index("by_conference", ["conferenceId"]),

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
    // isDemoBot: undefined means false
    isDemoBot: v.optional(v.boolean()),
    // Calendar preference: show public events (undefined means true)
    showPublicEvents: v.optional(v.boolean()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_name", ["name"])
    .index("by_calendarToken", ["calendarToken"]),

  meetings: defineTable({
    ...meetingFields,
    creatorId: v.id("users"),
  })
    .index("by_creator", ["creatorId", "scheduledTime"])
    .index("by_time", ["scheduledTime"])
    .index("by_public", ["isPublic", "scheduledTime"])
    .index("by_title_public", ["title", "isPublic"]),

  meetingParticipants: defineTable({
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    status: meetingParticipantStatusValidator,
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId", "meetingId"])
    .index("by_user_only", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  notifications: defineTable(notificationValidator)
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),

  // LLM rate limiting - tracks usage per window (minute/hour/day)
  llmRateLimits: defineTable({
    window: llmRateLimitWindowValidator,
    windowStart: utcTimestamp,
    count: v.number(),
  }).index("by_window_and_start", ["window", "windowStart"]),

  // Chat rooms - identified by participants, no names for MVP
  chatRooms: defineTable({
    lastMessageAt: v.optional(utcTimestamp),
  }).index("by_lastMessage", ["lastMessageAt"]),

  // Chat room participants
  chatRoomUsers: defineTable({
    chatRoomId: v.id("chatRooms"),
    userId: v.id("users"),
  })
    .index("by_chatRoom", ["chatRoomId"])
    .index("by_user", ["userId"])
    .index("by_chatRoom_and_user", ["chatRoomId", "userId"]),

  // Chat messages with optional reply support
  chatRoomMessages: defineTable({
    chatRoomId: v.id("chatRooms"),
    senderId: v.id("users"),
    content: v.string(),
    parentMessageId: v.optional(v.id("chatRoomMessages")),
  })
    .index("by_chatRoom", ["chatRoomId"])
    .index("by_parent", ["parentMessageId"]),
});
