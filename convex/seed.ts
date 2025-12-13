import { internalMutation, mutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserOrCrash } from "./users";

export const clearAllData = internalMutation({
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

    // Delete all users (except those with real Clerk IDs)
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.clerkId.startsWith("seed_user_")) {
        await ctx.db.delete(u._id);
      }
    }

    return { success: true, message: "All data cleared" };
  },
});

export const seedData = internalMutation({
  args: {
    baseTimestamp: v.number(),
    testRunId: v.optional(v.string()), // For test isolation - prefixes clerkIds
  },
  handler: async (ctx, args) => {
    const now = args.baseTimestamp;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const prefix = args.testRunId ? `${args.testRunId}_` : "";

    // Create sample users if they don't exist
    const sampleUsers = [
      {
        clerkId: `${prefix}seed_user_1`,
        name: "Alice Johnson",
        email: "alice@example.com",
        bio: "Product Manager passionate about building great user experiences",
        company: "TechCorp",
        role: "Senior Product Manager",
        interests: ["Product Design", "User Research", "Agile"],
        canHelpWith: "Product strategy, roadmap planning, stakeholder management, user interviews, and prioritization frameworks",
        needsHelpWith: "Technical architecture decisions, scaling engineering teams, and understanding ML/AI capabilities",
        isDemoBot: true,
      },
      {
        clerkId: `${prefix}seed_user_2`,
        name: "Bob Smith",
        email: "bob@example.com",
        bio: "Full-stack developer with 10+ years of experience",
        company: "StartupXYZ",
        role: "Lead Engineer",
        interests: ["React", "Node.js", "Cloud Architecture"],
        canHelpWith: "System design, code reviews, React performance optimization, and building scalable APIs",
        needsHelpWith: "Product thinking, understanding user needs, and design feedback for developer tools",
        isDemoBot: true,
      },
      {
        clerkId: `${prefix}seed_user_3`,
        name: "Carol Davis",
        email: "carol@example.com",
        bio: "Marketing strategist helping companies grow",
        company: "GrowthLab",
        role: "VP of Marketing",
        interests: ["Content Marketing", "SEO", "Brand Strategy"],
        canHelpWith: "Go-to-market strategy, content marketing, brand positioning, and growth experiments",
        needsHelpWith: "Understanding technical products, analytics implementation, and developer marketing",
        isDemoBot: true,
      },
      {
        clerkId: `${prefix}seed_user_4`,
        name: "David Chen",
        email: "david@example.com",
        bio: "Designer focused on creating delightful experiences",
        company: "DesignStudio",
        role: "UX Designer",
        interests: ["UI/UX", "Design Systems", "Accessibility"],
        canHelpWith: "Design critiques, building design systems, accessibility audits, and user testing facilitation",
        needsHelpWith: "Frontend implementation best practices, motion design, and 3D/WebGL experiences",
        isDemoBot: true,
      },
      {
        clerkId: `${prefix}seed_user_5`,
        name: "Emma Wilson",
        email: "emma@example.com",
        bio: "Data scientist uncovering insights from data",
        company: "DataCorp",
        role: "Senior Data Scientist",
        interests: ["Machine Learning", "Python", "Data Visualization"],
        canHelpWith: "Data analysis, ML model selection, experiment design, and building data pipelines",
        needsHelpWith: "Deploying ML models to production, MLOps best practices, and communicating insights to non-technical stakeholders",
        isDemoBot: true,
      },
    ];

    const seedUserIds: Id<"users">[] = [];

    for (const userData of sampleUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();

      if (!existing) {
        const id = await ctx.db.insert("users", userData);
        seedUserIds.push(id);
      } else {
        // Ensure isDemoBot is set on existing seed users
        if (existing.isDemoBot !== true) {
          await ctx.db.patch(existing._id, { isDemoBot: true });
        }
        seedUserIds.push(existing._id);
      }
    }

    // Get all users (including both seed users and real users)
    const allUsers = await ctx.db.query("users").collect();

    if (allUsers.length < 2) {
      throw new Error("Need at least 2 users. Database may have constraints.");
    }

    // Create public meetings if they don't exist (check by title to avoid duplicates)
    const publicMeetingTemplates = [
      {
        title: "Opening Keynote: Future of Tech",
        description: "Join us for an inspiring keynote about the future of technology and innovation. Perfect for all attendees!",
        scheduledTime: now + 2 * oneHour,
        duration: 90,
        location: "Main Auditorium",
        maxParticipants: 100,
      },
      {
        title: "Networking Coffee Break",
        description: "Casual networking session over coffee. Great opportunity to meet fellow attendees and exchange ideas.",
        scheduledTime: now + 4 * oneHour,
        duration: 30,
        location: "Lobby Lounge",
        maxParticipants: undefined,
      },
      {
        title: "AI & Machine Learning Workshop",
        description: "Hands-on workshop exploring the latest in AI and ML. Bring your laptop!",
        scheduledTime: now + oneDay,
        duration: 120,
        location: "Workshop Room A",
        maxParticipants: 25,
      },
      {
        title: "Startup Pitch Session",
        description: "Watch innovative startups pitch their ideas. Investors and entrepreneurs welcome!",
        scheduledTime: now + oneDay + 3 * oneHour,
        duration: 60,
        location: "Innovation Hub",
        maxParticipants: 50,
      },
      {
        title: "Product Demo: Latest Features",
        description: "Live demonstration of our newest product features. Q&A session included.",
        scheduledTime: now + 2 * oneDay,
        duration: 45,
        location: "Demo Theater",
        maxParticipants: 30,
      },
      {
        title: "Panel Discussion: Remote Work Best Practices",
        description: "Industry leaders discuss the future of remote work and hybrid teams.",
        scheduledTime: now + 2 * oneDay + 2 * oneHour,
        duration: 75,
        location: "Conference Hall B",
        maxParticipants: undefined,
      },
      {
        title: "Evening Networking Reception",
        description: "Wind down with drinks and networking. All conference attendees invited!",
        scheduledTime: now + 2 * oneDay + 6 * oneHour,
        duration: 120,
        location: "Rooftop Terrace",
        maxParticipants: undefined,
      },
      {
        title: "Breakfast with Industry Leaders",
        description: "Exclusive breakfast session with C-level executives. Limited spots available.",
        scheduledTime: now + 3 * oneDay,
        duration: 60,
        location: "Executive Dining Room",
        maxParticipants: 15,
      },
    ];

    const publicMeetingIds: Id<"meetings">[] = [];

    for (const template of publicMeetingTemplates) {
      // Check if this public meeting already exists
      const existing = await ctx.db
        .query("meetings")
        .withIndex("by_title_public", (q) =>
          q.eq("title", template.title).eq("isPublic", true)
        )
        .first();

      if (!existing) {
        // Create the public meeting with a random seed user as creator
        const creator = seedUserIds[Math.floor(Math.random() * seedUserIds.length)];

        // Move past meetings forward by 7 days until they're in the future
        let scheduledTime = template.scheduledTime;
        const oneDayAgo = now - oneDay;
        while (scheduledTime < oneDayAgo) {
          scheduledTime += 7 * oneDay;
        }

        const meetingId = await ctx.db.insert("meetings", {
          creatorId: creator,
          title: template.title,
          description: template.description,
          scheduledTime,
          duration: template.duration,
          location: template.location,
          isPublic: true,
          maxParticipants: template.maxParticipants,
        });

        publicMeetingIds.push(meetingId);

        // Add creator as participant
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: creator,
          status: "creator",
        });
      } else {
        // Update existing meeting if it's more than 1 day in the past
        const oneDayAgo = now - oneDay;
        if (existing.scheduledTime < oneDayAgo) {
          let newTime = existing.scheduledTime;
          while (newTime < oneDayAgo) {
            newTime += 7 * oneDay;
          }
          await ctx.db.patch(existing._id, { scheduledTime: newTime });
        }
        publicMeetingIds.push(existing._id);
      }
    }

    // Add seed users to some public meetings
    for (const userId of seedUserIds) {
      const shuffledPublic = [...publicMeetingIds].sort(() => Math.random() - 0.5);
      let added = 0;

      for (const meetingId of shuffledPublic) {
        if (added >= 4) break;

        const existing = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_user", (q) =>
            q.eq("userId", userId).eq("meetingId", meetingId)
          )
          .first();

        if (!existing) {
          await ctx.db.insert("meetingParticipants", {
            meetingId,
            userId,
            status: "accepted",
          });
          added++;
        }
      }
    }

    // Create some private meetings among seed users
    const privateMeetingTemplates = [
      { title: "1-on-1: Strategy Discussion", description: "Private discussion about project strategy and roadmap.", duration: 30, location: "Meeting Room 3" },
      { title: "Team Sync: Project Updates", description: "Quick sync on project progress and blockers.", duration: 45, location: "Conference Room A" },
      { title: "Coffee Chat", description: "Informal discussion over coffee.", duration: 30, location: "Cafe" },
      { title: "Brainstorming Session", description: "Creative brainstorming for new ideas.", duration: 45, location: "Innovation Lab" },
      { title: "Design Review", description: "Review design mockups and provide feedback.", duration: 60, location: "Design Studio" },
    ];

    for (let i = 0; i < seedUserIds.length; i++) {
      const user1 = seedUserIds[i];
      const user2 = seedUserIds[(i + 1) % seedUserIds.length];
      const template = privateMeetingTemplates[i % privateMeetingTemplates.length];

      const scheduledTime = now + (i + 1) * oneDay + 3 * oneHour;

      const meetingId = await ctx.db.insert("meetings", {
        creatorId: user1,
        title: template.title,
        description: template.description,
        scheduledTime,
        duration: template.duration,
        location: template.location,
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: user1,
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: user2,
        status: "accepted",
      });
    }

    const totalMeetings = await ctx.db.query("meetings").collect();
    const totalParticipations = await ctx.db.query("meetingParticipants").collect();

    return {
      success: true,
      summary: {
        totalUsers: allUsers.length,
        totalMeetings: totalMeetings.length,
        totalParticipations: totalParticipations.length,
      },
    };
  },
});

// Convenience mutation that uses current time (requires auth)
export const seedDataWithCurrentUserNow = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await seedDataWithCurrentUserHandler(ctx, { baseTimestamp: now });
  },
});

// Public seed function for CLI usage (no auth required, just seeds base data)
export const seedNow = mutation({
  args: {
    baseTimestamp: v.optional(v.number()),
    testRunId: v.optional(v.string()), // For test isolation
  },
  handler: async (ctx, args) => {
    const now = args.baseTimestamp ?? Date.now();
    await ctx.scheduler.runAfter(0, internal.seed.seedData, {
      baseTimestamp: now,
      testRunId: args.testRunId,
    });
    return { success: true, message: "Seed data scheduled", testRunId: args.testRunId };
  },
});

// Main seeding mutation that includes the current authenticated user
export const seedDataWithCurrentUser = mutation({
  args: {
    baseTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await seedDataWithCurrentUserHandler(ctx, args);
  },
});

async function seedDataWithCurrentUserHandler(
  ctx: MutationCtx,
  args: { baseTimestamp: number }
) {
    const currentUser = await getCurrentUserOrCrash(ctx);
    const now = args.baseTimestamp;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // First, run the base seed data
    await ctx.scheduler.runAfter(0, internal.seed.seedData, { baseTimestamp: now });

    // Create sample users for relationships (if they don't exist)
    const sampleUserData = [
      { clerkId: "seed_user_1", name: "Alice Johnson", email: "alice@example.com", role: "Senior Product Manager", company: "TechCorp" },
      { clerkId: "seed_user_2", name: "Bob Smith", email: "bob@example.com", role: "Lead Engineer", company: "StartupXYZ" },
      { clerkId: "seed_user_3", name: "Carol Davis", email: "carol@example.com", role: "VP of Marketing", company: "GrowthLab" },
      { clerkId: "seed_user_4", name: "David Chen", email: "david@example.com", role: "UX Designer", company: "DesignStudio" },
      { clerkId: "seed_user_5", name: "Emma Wilson", email: "emma@example.com", role: "Senior Data Scientist", company: "DataCorp" },
    ];

    const seedUserIds: Id<"users">[] = [];
    for (const userData of sampleUserData) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();
      if (existing) {
        seedUserIds.push(existing._id);
      }
    }

    // === CONFERENCES ===
    // Create TechConnect 2025 conference
    let techConnectId: Id<"conferences"> | null = null;
    const existingTechConnect = await ctx.db
      .query("conferences")
      .withIndex("by_name", (q) => q.eq("name", "TechConnect 2025"))
      .first();

    if (!existingTechConnect) {
      techConnectId = await ctx.db.insert("conferences", {
        name: "TechConnect 2025",
        description: "The premier technology conference bringing together innovators, developers, and industry leaders for 3 days of learning and networking.",
        startDate: now + 7 * oneDay,
        endDate: now + 10 * oneDay,
        timezone: "America/Los_Angeles",
        location: "San Francisco Convention Center",
        websiteUrl: "https://techconnect2025.example.com",
        createdBy: currentUser._id,
      });
    } else {
      techConnectId = existingTechConnect._id;
    }

    // Create meeting spots for TechConnect
    if (techConnectId) {
      const existingSpots = await ctx.db
        .query("conferenceMeetingSpots")
        .withIndex("by_conference", (q) => q.eq("conferenceId", techConnectId))
        .collect();

      if (existingSpots.length === 0) {
        const sampleSpots = ["Lobby Lounge", "Cafe Corner", "Garden Terrace", "Innovation Hub"];

        for (const name of sampleSpots) {
          await ctx.db.insert("conferenceMeetingSpots", {
            conferenceId: techConnectId,
            name,
          });
        }
      }
    }

    // Create AI Summit conference
    let aiSummitId: Id<"conferences"> | null = null;
    const existingAiSummit = await ctx.db
      .query("conferences")
      .withIndex("by_name", (q) => q.eq("name", "AI Summit 2025"))
      .first();

    if (!existingAiSummit) {
      aiSummitId = await ctx.db.insert("conferences", {
        name: "AI Summit 2025",
        description: "A one-day intensive summit focused on the latest advances in artificial intelligence and machine learning.",
        startDate: now + 14 * oneDay,
        endDate: now + 14 * oneDay + 10 * oneHour,
        timezone: "America/New_York",
        location: "Virtual / Online",
        websiteUrl: "https://aisummit2025.example.com",
        createdBy: seedUserIds[0] || currentUser._id,
      });
    } else {
      aiSummitId = existingAiSummit._id;
    }

    // === CONFERENCE ATTENDEES ===
    // Add current user to both conferences as attendee
    if (techConnectId) {
      const existingAttendance = await ctx.db
        .query("conferenceAttendees")
        .withIndex("by_conference_and_user", (q) =>
          q.eq("conferenceId", techConnectId).eq("userId", currentUser._id)
        )
        .first();

      if (!existingAttendance) {
        await ctx.db.insert("conferenceAttendees", {
          conferenceId: techConnectId,
          userId: currentUser._id,
          role: "attendee",
        });
      }

      // Add seed users to TechConnect with varied roles
      if (seedUserIds[0]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", techConnectId).eq("userId", seedUserIds[0]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: techConnectId, userId: seedUserIds[0], role: "organizer" });
        }
      }
      if (seedUserIds[1]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", techConnectId).eq("userId", seedUserIds[1]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: techConnectId, userId: seedUserIds[1], role: "speaker" });
        }
      }
      if (seedUserIds[2]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", techConnectId).eq("userId", seedUserIds[2]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: techConnectId, userId: seedUserIds[2], role: "speaker" });
        }
      }
      if (seedUserIds[3]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", techConnectId).eq("userId", seedUserIds[3]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: techConnectId, userId: seedUserIds[3], role: "attendee" });
        }
      }
    }

    if (aiSummitId) {
      const existingAttendance = await ctx.db
        .query("conferenceAttendees")
        .withIndex("by_conference_and_user", (q) =>
          q.eq("conferenceId", aiSummitId).eq("userId", currentUser._id)
        )
        .first();

      if (!existingAttendance) {
        await ctx.db.insert("conferenceAttendees", {
          conferenceId: aiSummitId,
          userId: currentUser._id,
          role: "attendee",
        });
      }

      // Add some seed users to AI Summit
      if (seedUserIds[4]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", aiSummitId).eq("userId", seedUserIds[4]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: aiSummitId, userId: seedUserIds[4], role: "organizer" });
        }
      }
      if (seedUserIds[1]) {
        const existing = await ctx.db.query("conferenceAttendees")
          .withIndex("by_conference_and_user", (q) => q.eq("conferenceId", aiSummitId).eq("userId", seedUserIds[1]))
          .first();
        if (!existing) {
          await ctx.db.insert("conferenceAttendees", { conferenceId: aiSummitId, userId: seedUserIds[1], role: "speaker" });
        }
      }
    }

    // === MEETINGS INVOLVING CURRENT USER ===

    // 1. Confirmed meeting - current user created and Bob accepted
    if (seedUserIds[1]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: currentUser._id,
        title: "Product Roadmap Discussion",
        description: "Let's align on Q2 product roadmap priorities",
        scheduledTime: now + 2 * oneDay + 10 * oneHour,
        duration: 45,
        location: "Zoom",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[1],
        status: "accepted",
      });
    }

    // 2. Confirmed meeting - Alice created and current user accepted
    if (seedUserIds[0]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[0],
        title: "User Research Findings Review",
        description: "Alice wants to share latest user research insights",
        scheduledTime: now + 3 * oneDay + 14 * oneHour,
        duration: 60,
        location: "Conference Room B",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[0],
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "accepted",
      });
    }

    // 3. Pending incoming request - Bob wants to meet current user
    if (seedUserIds[1]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[1],
        title: "Technical Architecture Review",
        description: "Would love to get your input on our new architecture design",
        scheduledTime: now + 4 * oneDay + 11 * oneHour,
        duration: 60,
        location: "Virtual - Google Meet",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[1],
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "pending",
      });
    }

    // 4. Pending incoming request - Carol wants to meet current user
    if (seedUserIds[2]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: seedUserIds[2],
        title: "Marketing Collaboration",
        description: "Let's explore how we can collaborate on upcoming campaigns",
        scheduledTime: now + 5 * oneDay + 15 * oneHour,
        duration: 30,
        location: "Cafe Lounge",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[2],
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "pending",
      });
    }

    // 5. Pending outgoing request - current user wants to meet David
    if (seedUserIds[3]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: currentUser._id,
        title: "Design Feedback Session",
        description: "Would like your expertise on our new UI designs",
        scheduledTime: now + 4 * oneDay + 16 * oneHour,
        duration: 45,
        location: "Design Studio",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[3],
        status: "pending",
      });
    }

    // 6. Declined meeting - Emma declined current user's request
    if (seedUserIds[4]) {
      const meetingId = await ctx.db.insert("meetings", {
        creatorId: currentUser._id,
        title: "Data Analysis Review",
        description: "Review of quarterly analytics data",
        scheduledTime: now + 1 * oneDay + 9 * oneHour,
        duration: 30,
        location: "Data Lab",
        isPublic: false,
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: currentUser._id,
        status: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: seedUserIds[4],
        status: "declined",
      });
    }

    // === NOTIFICATIONS FOR CURRENT USER ===
    // Meeting request notification
    if (seedUserIds[1]) {
      await ctx.db.insert("notifications", {
        userId: currentUser._id,
        type: "meeting_request",
        relatedUserId: seedUserIds[1],
        isRead: false,
      });
    }

    // Meeting accepted notification
    if (seedUserIds[0]) {
      await ctx.db.insert("notifications", {
        userId: currentUser._id,
        type: "meeting_accepted",
        relatedUserId: seedUserIds[0],
        isRead: false,
      });
    }

    // Conference announcement
    if (techConnectId) {
      await ctx.db.insert("notifications", {
        userId: currentUser._id,
        type: "conference_announcement",
        relatedConferenceId: techConnectId,
        isRead: false,
      });
    }

    // Meeting reminder
    await ctx.db.insert("notifications", {
      userId: currentUser._id,
      type: "meeting_reminder",
      isRead: true,
    });

    // Another meeting request (from Carol)
    if (seedUserIds[2]) {
      await ctx.db.insert("notifications", {
        userId: currentUser._id,
        type: "meeting_request",
        relatedUserId: seedUserIds[2],
        isRead: false,
      });
    }

    return {
      success: true,
      message: "Seed data created with current user included in relationships",
    };
}
