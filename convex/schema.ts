import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema defines your data model for the database.
// For more information, see https://docs.convex.dev/database/schema
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    balance: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  transactions: defineTable({
    from: v.id("users"),
    to: v.id("users"),
    amount: v.number(),
    note: v.string(),
  })
    .index("by_from", ["from"])
    .index("by_to", ["to"]),
});
