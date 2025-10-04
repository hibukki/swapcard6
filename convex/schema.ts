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
      v.literal("declined")
    ),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId", "meetingId"])
    .index("by_user_only", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  // Chat system tables
  chats: defineTable({
    name: v.optional(v.string()), // Optional name for group chats
    isGroup: v.boolean(), // true for 3+ users, false for 1-on-1
  }),

  chatParticipants: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"])
    .index("by_user_and_chat", ["userId", "chatId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    authorId: v.id("users"),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")), // For replies
  })
    .index("by_chat", ["chatId", "_creationTime"])
    .index("by_parent", ["parentMessageId", "_creationTime"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),
});
