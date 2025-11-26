import { v } from "convex/values";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

// Seed data with a fixed timestamp for deterministic e2e tests
export const seedWithFixedTimestamp = testingMutation({
  args: {
    baseTimestamp: v.number(),
    userName: v.string(),
  },
  handler: async (ctx, { baseTimestamp, userName }) => {
    // Find the test user
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", userName))
      .first();

    if (!user) {
      throw new Error(`User "${userName}" not found`);
    }

    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Run base seed data with fixed timestamp
    await ctx.scheduler.runAfter(0, internal.seed.seedData, { baseTimestamp });

    // Get or create seed users
    const sampleUserData = [
      { clerkId: "seed_user_1", name: "Alice Johnson", email: "alice@example.com", role: "Senior Product Manager", company: "TechCorp" },
      { clerkId: "seed_user_2", name: "Bob Smith", email: "bob@example.com", role: "Lead Engineer", company: "StartupXYZ" },
      { clerkId: "seed_user_3", name: "Carol Davis", email: "carol@example.com", role: "VP of Marketing", company: "GrowthLab" },
      { clerkId: "seed_user_4", name: "David Chen", email: "david@example.com", role: "UX Designer", company: "DesignStudio" },
      { clerkId: "seed_user_5", name: "Emma Wilson", email: "emma@example.com", role: "Senior Data Scientist", company: "DataCorp" },
    ];

    const seedUserIds: typeof user._id[] = [];
    for (const userData of sampleUserData) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();
      if (existing) {
        seedUserIds.push(existing._id);
      }
    }

    // Create meetings for the test user (same as seedDataWithCurrentUser)
    if (seedUserIds[1]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[1],
        title: "Technical Architecture Review",
        description: "Would love to get your input on our new architecture design",
        scheduledTime: baseTimestamp + 4 * oneDay + 11 * oneHour,
        duration: 60,
        location: "Virtual - Google Meet",
        isPublic: false,
      });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: seedUserIds[1], status: "creator" });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: user._id, status: "pending" });
    }

    if (seedUserIds[2]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[2],
        title: "Marketing Collaboration",
        description: "Let's explore how we can collaborate on upcoming campaigns",
        scheduledTime: baseTimestamp + 5 * oneDay + 15 * oneHour,
        duration: 30,
        location: "Cafe Lounge",
        isPublic: false,
      });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: seedUserIds[2], status: "creator" });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: user._id, status: "pending" });
    }

    return { success: true };
  },
});
