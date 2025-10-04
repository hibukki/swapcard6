import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  meetingRequests: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    proposedTime: v.optional(v.number()),
    proposedDuration: v.optional(v.number()), // in minutes
    location: v.optional(v.string()),
    message: v.optional(v.string()),
  })
    .index("by_recipient", ["recipientId", "status"])
    .index("by_requester", ["requesterId", "status"])
    .index("by_status", ["status"]),

  meetings: defineTable({
    requestId: v.optional(v.id("meetingRequests")), // optional for public meetings
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(), // in minutes
    location: v.optional(v.string()),
    isPublic: v.boolean(), // true = anyone can join, false = invite-only
    maxParticipants: v.optional(v.number()), // null = unlimited
    notes: v.optional(v.string()),
  })
    .index("by_creator", ["creatorId", "scheduledTime"])
    .index("by_time", ["scheduledTime"])
    .index("by_public", ["isPublic", "scheduledTime"]),

  // Junction table for meeting participants
  meetingParticipants: defineTable({
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    role: v.union(
      v.literal("creator"),
      v.literal("participant")
    ),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId", "meetingId"])
    .index("by_user_only", ["userId"]),
});
