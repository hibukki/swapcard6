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

  meetings: defineTable({
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
    status: v.union(
      v.literal("creator"),
      v.literal("accepted"),
      v.literal("pending"),
      v.literal("declined"),
    ),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId", "meetingId"])
    .index("by_user_only", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),
});
