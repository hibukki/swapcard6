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

    // Delete chat messages
    const chatMessages = await ctx.db.query("chatRoomMessages").collect();
    for (const m of chatMessages) {
      await ctx.db.delete(m._id);
    }

    // Delete chat room users
    const chatRoomUsers = await ctx.db.query("chatRoomUsers").collect();
    for (const u of chatRoomUsers) {
      await ctx.db.delete(u._id);
    }

    // Delete chat rooms
    const chatRooms = await ctx.db.query("chatRooms").collect();
    for (const r of chatRooms) {
      await ctx.db.delete(r._id);
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
    testRunId: v.optional(v.string()), // For test isolation
  },
  handler: async (ctx, { baseTimestamp, userName, testRunId }) => {
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
    const prefix = testRunId ? `${testRunId}_` : "";

    // Create seed users synchronously (with prefix for isolation)
    // These are the same users as in seed.ts but we create them here to ensure they exist
    // before we create meetings that reference them
    const sampleUserData = [
      {
        clerkId: `${prefix}seed_user_1`,
        name: "Alice Johnson",
        email: "alice@example.com",
        role: "Senior Product Manager",
        company: "TechCorp",
        bio: "Passionate about building products that make a difference. 10+ years in tech.",
        interests: ["AI Safety", "Product Strategy", "User Research"],
        canHelpWith: "Product management, roadmap planning, user research",
        needsHelpWith: "AI/ML integration, data science",
      },
      {
        clerkId: `${prefix}seed_user_2`,
        name: "Bob Smith",
        email: "bob@example.com",
        role: "Lead Engineer",
        company: "StartupXYZ",
        bio: "Full-stack developer with a passion for clean code and scalable systems.",
        interests: ["System Design", "Open Source", "DevOps"],
        canHelpWith: "Technical architecture, code reviews, mentoring",
        needsHelpWith: "Product design, fundraising",
      },
      {
        clerkId: `${prefix}seed_user_3`,
        name: "Carol Davis",
        email: "carol@example.com",
        role: "VP of Marketing",
        company: "GrowthLab",
        bio: "Marketing strategies that grow brands. Ex-Google, ex-Meta.",
        interests: ["Growth Hacking", "Content Strategy", "Analytics"],
        canHelpWith: "Marketing strategy, brand building, growth",
        needsHelpWith: "Engineering resources, product design",
      },
      {
        clerkId: `${prefix}seed_user_4`,
        name: "David Chen",
        email: "david@example.com",
        role: "UX Designer",
        company: "DesignStudio",
        bio: "Creating delightful user experiences. Design thinking advocate.",
        interests: ["UI Design", "Accessibility", "Design Systems"],
        canHelpWith: "UX design, user testing, design systems",
        needsHelpWith: "Engineering implementation, analytics",
      },
      {
        clerkId: `${prefix}seed_user_5`,
        name: "Emma Wilson",
        email: "emma@example.com",
        role: "Senior Data Scientist",
        company: "DataCorp",
        bio: "Data scientist passionate about using ML for social good.",
        interests: ["Machine Learning", "AI Ethics", "Data Visualization"],
        canHelpWith: "Data science, ML models, analytics",
        needsHelpWith: "Product management, front-end development",
      },
    ];

    const seedUserIds: typeof user._id[] = [];
    for (const userData of sampleUserData) {
      // Check if user already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();
      if (existing) {
        seedUserIds.push(existing._id);
      } else {
        // Create the user
        const newUserId = await ctx.db.insert("users", userData);
        seedUserIds.push(newUserId);
      }
    }

    // Run base seed data (public meetings, conferences) with fixed timestamp
    await ctx.scheduler.runAfter(0, internal.seed.seedData, { baseTimestamp, testRunId });

    // Get the conference created by seedData
    const conference = await ctx.db
      .query("conferences")
      .withIndex("by_name", (q) => q.eq("name", "TechConnect 2025"))
      .first();

    if (!conference) {
      throw new Error("TechConnect 2025 conference not found - seedData may not have run yet");
    }

    // Create meetings for the test user
    if (seedUserIds[1]) {
      const meetingId = await ctx.db.insert("meetings", {
        conferenceId: conference._id,
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
        conferenceId: conference._id,
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

    return { success: true, testRunId };
  },
});

// Clean up test data by testRunId prefix
export const cleanupTestRun = testingMutation({
  args: {
    testRunId: v.string(),
  },
  handler: async (ctx, { testRunId }) => {
    const prefix = `${testRunId}_`;

    // Find all users with the testRunId prefix in their clerkId
    const users = await ctx.db.query("users").collect();
    const testUsers = users.filter((u) => u.clerkId.startsWith(prefix));
    const testUserIds = new Set(testUsers.map((u) => u._id));

    // Delete meeting participants for test users
    const participants = await ctx.db.query("meetingParticipants").collect();
    for (const p of participants) {
      if (testUserIds.has(p.userId)) {
        await ctx.db.delete(p._id);
      }
    }

    // Delete meetings created by test users
    const meetings = await ctx.db.query("meetings").collect();
    for (const m of meetings) {
      if (testUserIds.has(m.creatorId)) {
        // Delete remaining participants of this meeting
        const meetingParticipants = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", m._id))
          .collect();
        for (const p of meetingParticipants) {
          await ctx.db.delete(p._id);
        }
        await ctx.db.delete(m._id);
      }
    }

    // Delete chat room users for test users
    const chatRoomUsers = await ctx.db.query("chatRoomUsers").collect();
    for (const u of chatRoomUsers) {
      if (testUserIds.has(u.userId)) {
        await ctx.db.delete(u._id);
      }
    }

    // Delete chat messages from test users
    const chatMessages = await ctx.db.query("chatRoomMessages").collect();
    for (const m of chatMessages) {
      if (testUserIds.has(m.senderId)) {
        await ctx.db.delete(m._id);
      }
    }

    // Delete conferences created by test users
    const conferences = await ctx.db.query("conferences").collect();
    for (const c of conferences) {
      if (testUserIds.has(c.createdBy)) {
        // Delete conference attendees first
        const attendees = await ctx.db
          .query("conferenceAttendees")
          .withIndex("by_conference", (q) => q.eq("conferenceId", c._id))
          .collect();
        for (const a of attendees) {
          await ctx.db.delete(a._id);
        }
        await ctx.db.delete(c._id);
      }
    }

    // Delete notifications for test users
    const notifications = await ctx.db.query("notifications").collect();
    for (const n of notifications) {
      if (testUserIds.has(n.userId)) {
        await ctx.db.delete(n._id);
      }
    }

    // Finally, delete the test users themselves
    for (const user of testUsers) {
      await ctx.db.delete(user._id);
    }

    return { success: true, deletedUsers: testUsers.length };
  },
});
