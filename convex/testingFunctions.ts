import { v } from "convex/values";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query } from "./_generated/server";

function assertTestEnvironment() {
  if (process.env.IS_TEST !== "true") {
    throw new Error(
      "IS_TEST environment variable is not set to 'true'. " +
      "Set IS_TEST=true in your Convex deployment environment variables to run tests."
    );
  }
}

const testingQuery = customQuery(query, {
  args: {},
  input: async (_ctx, _args) => {
    assertTestEnvironment();
    return { ctx: {}, args: {} };
  },
});

const testingMutation = customMutation(mutation, {
  args: {},
  input: async (_ctx, _args) => {
    assertTestEnvironment();
    return { ctx: {}, args: {} };
  },
});

// Query to verify test environment is properly configured
// Call this at the start of your test suite to fail fast
export const verifyTestEnvironment = testingQuery({
  args: {},
  handler: async () => {
    return { isTestEnvironment: true };
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
    // Delete notifications
    const notifications = await ctx.db.query("notifications").collect();
    for (const n of notifications) {
      await ctx.db.delete(n._id);
    }

    // Delete conferenceAttendees
    const conferenceAttendees = await ctx.db.query("conferenceAttendees").collect();
    for (const ca of conferenceAttendees) {
      await ctx.db.delete(ca._id);
    }

    // Delete conferences
    const conferences = await ctx.db.query("conferences").collect();
    for (const c of conferences) {
      await ctx.db.delete(c._id);
    }

    // Delete meetingParticipants
    const participants = await ctx.db.query("meetingParticipants").collect();
    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    // Delete meetings
    const meetings = await ctx.db.query("meetings").collect();
    for (const m of meetings) {
      await ctx.db.delete(m._id);
    }

    // Delete users
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }

    return { success: true };
  },
});
