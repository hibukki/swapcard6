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

    // Delete conferenceMeetingSpots
    const meetingSpots = await ctx.db.query("conferenceMeetingSpots").collect();
    for (const spot of meetingSpots) {
      await ctx.db.delete(spot._id);
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

    // Create EA Global conference for e2e tests
    const eaGlobalName = "EA Global";

    let eaGlobalId;
    const existingEaGlobal = await ctx.db
      .query("conferences")
      .withIndex("by_name", (q) => q.eq("name", eaGlobalName))
      .first();

    if (existingEaGlobal) {
      eaGlobalId = existingEaGlobal._id;
    } else {
      eaGlobalId = await ctx.db.insert("conferences", {
        name: eaGlobalName,
        description: "Effective Altruism Global conference - connecting people to do the most good",
        startDate: baseTimestamp,
        endDate: baseTimestamp + 3 * oneDay,
        timezone: "America/Los_Angeles",
        location: "San Francisco",
        createdBy: user._id,
      });
    }

    // Add test user to EA Global conference
    const existingTestUserAttendance = await ctx.db
      .query("conferenceAttendees")
      .withIndex("by_conference_and_user", (q) =>
        q.eq("conferenceId", eaGlobalId).eq("userId", user._id)
      )
      .first();

    if (!existingTestUserAttendance) {
      await ctx.db.insert("conferenceAttendees", {
        conferenceId: eaGlobalId,
        userId: user._id,
        role: "attendee",
      });
    }

    // Add seed users to EA Global conference
    for (const seedUserId of seedUserIds) {
      const existingAttendance = await ctx.db
        .query("conferenceAttendees")
        .withIndex("by_conference_and_user", (q) =>
          q.eq("conferenceId", eaGlobalId).eq("userId", seedUserId)
        )
        .first();

      if (!existingAttendance) {
        await ctx.db.insert("conferenceAttendees", {
          conferenceId: eaGlobalId,
          userId: seedUserId,
          role: "attendee",
        });
      }
    }

    // Create meeting spots for EA Global
    const existingSpots = await ctx.db
      .query("conferenceMeetingSpots")
      .withIndex("by_conference", (q) => q.eq("conferenceId", eaGlobalId))
      .collect();

    if (existingSpots.length === 0) {
      const spotNames = ["Lobby Lounge", "Cafe Corner", "Garden Terrace", "Innovation Hub"];
      for (const name of spotNames) {
        await ctx.db.insert("conferenceMeetingSpots", {
          conferenceId: eaGlobalId,
          name,
        });
      }
    }

    // Create public meetings for EA Global directly (instead of seedData which uses "Seed Conference")
    const publicMeetingTemplates = [
      {
        title: "Opening Keynote: Future of Tech",
        description: "Join us for an inspiring keynote about the future of technology and innovation. Perfect for all attendees!",
        scheduledTime: baseTimestamp + 2 * oneHour,
        duration: 90,
        location: "Main Auditorium",
        maxParticipants: 100,
      },
      {
        title: "Networking Coffee Break",
        description: "Casual networking session over coffee. Great opportunity to meet fellow attendees and exchange ideas.",
        scheduledTime: baseTimestamp + 4 * oneHour,
        duration: 30,
        location: "Lobby Lounge",
        maxParticipants: undefined,
      },
      {
        title: "AI & Machine Learning Workshop",
        description: "Hands-on workshop exploring the latest in AI and ML. Bring your laptop!",
        scheduledTime: baseTimestamp + oneDay,
        duration: 120,
        location: "Workshop Room A",
        maxParticipants: 25,
      },
      {
        title: "Startup Pitch Session",
        description: "Watch innovative startups pitch their ideas. Investors and entrepreneurs welcome!",
        scheduledTime: baseTimestamp + oneDay + 3 * oneHour,
        duration: 60,
        location: "Innovation Hub",
        maxParticipants: 50,
      },
    ];

    for (let i = 0; i < publicMeetingTemplates.length; i++) {
      const template = publicMeetingTemplates[i];
      // Check for existing meeting with same title in this conference
      const existingInConference = await ctx.db
        .query("meetings")
        .withIndex("by_conference_public", (q) =>
          q.eq("conferenceId", eaGlobalId).eq("isPublic", true)
        )
        .filter((q) => q.eq(q.field("title"), template.title))
        .first();

      if (!existingInConference) {
        const creator = seedUserIds[i % seedUserIds.length];
        const meetingId = await ctx.db.insert("meetings", {
          creatorId: creator,
          title: template.title,
          description: template.description,
          scheduledTime: template.scheduledTime,
          duration: template.duration,
          location: template.location,
          isPublic: true,
          maxParticipants: template.maxParticipants,
          conferenceId: eaGlobalId,
        });

        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: creator,
          status: "creator",
        });
      }
    }

    // Create meetings for the test user
    if (seedUserIds[1]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[1],
        title: "Technical Architecture Review",
        description: "Would love to get your input on our new architecture design",
        scheduledTime: baseTimestamp + 4 * oneDay + 11 * oneHour,
        duration: 60,
        location: "Virtual - Google Meet",
        isPublic: false,
        conferenceId: eaGlobalId,
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
        conferenceId: eaGlobalId,
      });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: seedUserIds[2], status: "creator" });
      await ctx.db.insert("meetingParticipants", { meetingId, userId: user._id, status: "pending" });
    }

    // Create sample chat conversation between Alice and the test user
    if (seedUserIds[0]) {
      const aliceId = seedUserIds[0];

      // Check if chat room already exists between these users
      const existingChatRoomUsers = await ctx.db
        .query("chatRoomUsers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      let existingChatRoomId = null;
      for (const cru of existingChatRoomUsers) {
        const otherUsers = await ctx.db
          .query("chatRoomUsers")
          .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", cru.chatRoomId))
          .collect();
        if (otherUsers.some((u) => u.userId === aliceId)) {
          existingChatRoomId = cru.chatRoomId;
          break;
        }
      }

      if (!existingChatRoomId) {
        // Create chat room
        const chatRoomId = await ctx.db.insert("chatRooms", {
          lastMessageAt: baseTimestamp - 2 * oneHour,
        });

        // Add both users to the chat room
        await ctx.db.insert("chatRoomUsers", { chatRoomId, userId: user._id });
        await ctx.db.insert("chatRoomUsers", { chatRoomId, userId: aliceId });

        // Add sample messages (Alice initiating conversation)
        await ctx.db.insert("chatRoomMessages", {
          chatRoomId,
          senderId: aliceId,
          content: "Hi! I saw your profile and noticed we have overlapping interests in AI Safety. Would love to connect!",
        });

        await ctx.db.insert("chatRoomMessages", {
          chatRoomId,
          senderId: aliceId,
          content: "Are you attending the AI & Machine Learning Workshop tomorrow?",
        });

        // Update lastMessageAt after inserting messages
        await ctx.db.patch(chatRoomId, { lastMessageAt: baseTimestamp });
      }
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
        // Delete conference meeting spots first
        const spots = await ctx.db
          .query("conferenceMeetingSpots")
          .withIndex("by_conference", (q) => q.eq("conferenceId", c._id))
          .collect();
        for (const s of spots) {
          await ctx.db.delete(s._id);
        }
        // Delete conference attendees
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
