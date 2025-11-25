import { v } from "convex/values";
import { customMutation } from "convex-helpers/server/customFunctions";
import { mutation } from "./_generated/server";

const testingMutation = customMutation(mutation, {
  args: {},
  input: async (_ctx, _args) => {
    if (process.env.IS_TEST !== "true") {
      throw new Error("Calling a test-only function in non-test environment");
    }
    return { ctx: {}, args: {} };
  },
});

export const deleteTestUser = testingMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const clearAllData = testingMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all meetingParticipants
    const participants = await ctx.db.query("meetingParticipants").collect();
    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    // Delete all meetings
    const meetings = await ctx.db.query("meetings").collect();
    for (const m of meetings) {
      await ctx.db.delete(m._id);
    }

    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }

    return { success: true };
  },
});
