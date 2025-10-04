import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const seedData = internalMutation({
  args: {
    currentUserClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only clear seed data (meetings/requests created by seed script)
    // Keep real user data intact
    const seedUserIds: string[] = [];

    // Get seed users
    for (let i = 1; i <= 5; i++) {
      const seedUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", `seed_user_${i}`))
        .unique();
      if (seedUser) {
        seedUserIds.push(seedUser._id);
      }
    }

    // Delete only meetings created by or with seed users
    const allMeetings = await ctx.db.query("meetings").collect();
    for (const meeting of allMeetings) {
      const participants = await ctx.db
        .query("meetingParticipants")
        .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
        .collect();

      // Delete if any participant is a seed user
      const hasSeedUser = participants.some((p) => seedUserIds.includes(p.userId));
      if (hasSeedUser || seedUserIds.includes(meeting.creatorId)) {
        // Delete participants first
        for (const p of participants) {
          await ctx.db.delete(p._id);
        }
        await ctx.db.delete(meeting._id);
      }
    }

    // Delete requests involving seed users
    const allRequests = await ctx.db.query("meetingRequests").collect();
    for (const request of allRequests) {
      if (
        seedUserIds.includes(request.requesterId) ||
        seedUserIds.includes(request.recipientId)
      ) {
        await ctx.db.delete(request._id);
      }
    }

    // Get current user if provided (do this first)
    let currentUser = null;
    if (args.currentUserClerkId) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) =>
          q.eq("clerkId", args.currentUserClerkId!)
        )
        .unique();
    }

    // Get all users
    let users = await ctx.db.query("users").collect();

    // Create sample users if there aren't enough
    const sampleUsers = [
      {
        clerkId: "seed_user_1",
        name: "Alice Johnson",
        email: "alice@example.com",
        bio: "Product Manager passionate about building great user experiences",
        company: "TechCorp",
        role: "Senior Product Manager",
        interests: ["Product Design", "User Research", "Agile"],
      },
      {
        clerkId: "seed_user_2",
        name: "Bob Smith",
        email: "bob@example.com",
        bio: "Full-stack developer with 10+ years of experience",
        company: "StartupXYZ",
        role: "Lead Engineer",
        interests: ["React", "Node.js", "Cloud Architecture"],
      },
      {
        clerkId: "seed_user_3",
        name: "Carol Davis",
        email: "carol@example.com",
        bio: "Marketing strategist helping companies grow",
        company: "GrowthLab",
        role: "VP of Marketing",
        interests: ["Content Marketing", "SEO", "Brand Strategy"],
      },
      {
        clerkId: "seed_user_4",
        name: "David Chen",
        email: "david@example.com",
        bio: "Designer focused on creating delightful experiences",
        company: "DesignStudio",
        role: "UX Designer",
        interests: ["UI/UX", "Design Systems", "Accessibility"],
      },
      {
        clerkId: "seed_user_5",
        name: "Emma Wilson",
        email: "emma@example.com",
        bio: "Data scientist uncovering insights from data",
        company: "DataCorp",
        role: "Senior Data Scientist",
        interests: ["Machine Learning", "Python", "Data Visualization"],
      },
    ];

    // Only create sample users that don't already exist
    for (const userData of sampleUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();

      if (!existing) {
        await ctx.db.insert("users", userData);
      }
    }

    // Refresh users list
    users = await ctx.db.query("users").collect();

    if (users.length < 2) {
      throw new Error(
        "Failed to create sample users. Database may have constraints preventing user creation."
      );
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Create sample public meetings
    const publicMeetings = [
      {
        title: "Opening Keynote: Future of Tech",
        description:
          "Join us for an inspiring keynote about the future of technology and innovation. Perfect for all attendees!",
        scheduledTime: now + 2 * oneHour,
        duration: 90,
        location: "Main Auditorium",
        maxParticipants: 100,
      },
      {
        title: "Networking Coffee Break",
        description:
          "Casual networking session over coffee. Great opportunity to meet fellow attendees and exchange ideas.",
        scheduledTime: now + 4 * oneHour,
        duration: 30,
        location: "Lobby Lounge",
        maxParticipants: undefined,
      },
      {
        title: "AI & Machine Learning Workshop",
        description:
          "Hands-on workshop exploring the latest in AI and ML. Bring your laptop!",
        scheduledTime: now + oneDay,
        duration: 120,
        location: "Workshop Room A",
        maxParticipants: 25,
      },
      {
        title: "Startup Pitch Session",
        description:
          "Watch innovative startups pitch their ideas. Investors and entrepreneurs welcome!",
        scheduledTime: now + oneDay + 3 * oneHour,
        duration: 60,
        location: "Innovation Hub",
        maxParticipants: 50,
      },
      {
        title: "Product Demo: Latest Features",
        description:
          "Live demonstration of our newest product features. Q&A session included.",
        scheduledTime: now + 2 * oneDay,
        duration: 45,
        location: "Demo Theater",
        maxParticipants: 30,
      },
      {
        title: "Panel Discussion: Remote Work Best Practices",
        description:
          "Industry leaders discuss the future of remote work and hybrid teams.",
        scheduledTime: now + 2 * oneDay + 2 * oneHour,
        duration: 75,
        location: "Conference Hall B",
        maxParticipants: undefined,
      },
      {
        title: "Evening Networking Reception",
        description:
          "Wind down with drinks and networking. All conference attendees invited!",
        scheduledTime: now + 2 * oneDay + 6 * oneHour,
        duration: 120,
        location: "Rooftop Terrace",
        maxParticipants: undefined,
      },
      {
        title: "Breakfast with Industry Leaders",
        description:
          "Exclusive breakfast session with C-level executives. Limited spots available.",
        scheduledTime: now + 3 * oneDay,
        duration: 60,
        location: "Executive Dining Room",
        maxParticipants: 15,
      },
    ];

    // Get only seed users for public meeting participants (exclude current user)
    const seedUsers = users.filter((u) =>
      u.clerkId.startsWith("seed_user_") && (!currentUser || u._id !== currentUser._id)
    );

    // Create public meetings with participants
    for (const meetingData of publicMeetings) {
      const creatorIndex = Math.floor(Math.random() * seedUsers.length);
      const creator = seedUsers[creatorIndex];

      const meetingId = await ctx.db.insert("meetings", {
        creatorId: creator._id,
        title: meetingData.title,
        description: meetingData.description,
        scheduledTime: meetingData.scheduledTime,
        duration: meetingData.duration,
        location: meetingData.location,
        isPublic: true,
        maxParticipants: meetingData.maxParticipants,
      });

      // Add creator as participant
      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: creator._id,
        role: "creator",
      });

      // Add some random participants (2-5 participants per meeting) from seed users only
      const numParticipants = Math.floor(Math.random() * 4) + 2;
      const availableUsers = seedUsers.filter((u) => u._id !== creator._id);

      // Shuffle available users for better distribution
      const shuffledUsers = [...availableUsers].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(numParticipants, shuffledUsers.length); i++) {
        const participant = shuffledUsers[i];
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: participant._id,
          role: "participant",
        });
      }
    }

    // Create some private meetings between seed users only
    if (seedUsers.length >= 2) {
      const privateMeetings = [
        {
          title: "1-on-1: Strategy Discussion",
          description: "Private discussion about project strategy and roadmap.",
          scheduledTime: now + 5 * oneHour,
          duration: 30,
          location: "Meeting Room 3",
        },
        {
          title: "Team Sync: Project Updates",
          description: "Quick sync on project progress and blockers.",
          scheduledTime: now + oneDay + oneHour,
          duration: 45,
          location: "Conference Room A",
        },
        {
          title: "Client Meeting: Requirements Review",
          description: "Review client requirements and discuss next steps.",
          scheduledTime: now + oneDay + 4 * oneHour,
          duration: 60,
          location: "Virtual - Zoom",
        },
      ];

      for (const meetingData of privateMeetings) {
        const creatorIndex = Math.floor(Math.random() * seedUsers.length);
        const creator = seedUsers[creatorIndex];
        const participantIndex = (creatorIndex + 1) % seedUsers.length;
        const participant = seedUsers[participantIndex];

        const meetingId = await ctx.db.insert("meetings", {
          creatorId: creator._id,
          title: meetingData.title,
          description: meetingData.description,
          scheduledTime: meetingData.scheduledTime,
          duration: meetingData.duration,
          location: meetingData.location,
          isPublic: false,
        });

        // Add creator and participant
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: creator._id,
          role: "creator",
        });

        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: participant._id,
          role: "participant",
        });
      }
    }

    // Create private meetings with the current user
    if (currentUser && users.length >= 2) {
      const currentUserMeetings = [
        {
          title: "Coffee Chat with Alice",
          description: "Casual catch-up over coffee to discuss ideas.",
          scheduledTime: now + 6 * oneHour,
          duration: 30,
          location: "Lobby Coffee Shop",
          withUser: "Alice Johnson",
        },
        {
          title: "Project Brainstorm with Bob",
          description: "Discuss new project ideas and potential collaboration.",
          scheduledTime: now + oneDay + 3 * oneHour,
          duration: 45,
          location: "Innovation Lab",
          withUser: "Bob Smith",
        },
        {
          title: "Design Review with David",
          description: "Review design mockups and provide feedback.",
          scheduledTime: now + 2 * oneDay + oneHour,
          duration: 60,
          location: "Design Studio",
          withUser: "David Chen",
        },
      ];

      for (const meetingData of currentUserMeetings) {
        // Find the user by name
        const otherUser = users.find((u) => u.name === meetingData.withUser);
        if (!otherUser) continue;

        const meetingId = await ctx.db.insert("meetings", {
          creatorId: currentUser._id,
          title: meetingData.title,
          description: meetingData.description,
          scheduledTime: meetingData.scheduledTime,
          duration: meetingData.duration,
          location: meetingData.location,
          isPublic: false,
        });

        // Add current user as creator
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: currentUser._id,
          role: "creator",
        });

        // Add other user as participant
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: otherUser._id,
          role: "participant",
        });
      }
    }

    // Create some pending meeting requests between seed users
    if (seedUsers.length >= 3) {
      const requests = [
        {
          proposedTime: now + 3 * oneDay,
          proposedDuration: 30,
          location: "Cafe",
          message: "Would love to discuss potential collaboration opportunities!",
        },
        {
          proposedTime: now + 3 * oneDay + 2 * oneHour,
          proposedDuration: 45,
          location: "Office",
          message:
            "Let's chat about the upcoming project. I have some ideas to share.",
        },
      ];

      for (const requestData of requests) {
        const requesterIndex = Math.floor(Math.random() * seedUsers.length);
        const recipientIndex = (requesterIndex + 1) % seedUsers.length;

        await ctx.db.insert("meetingRequests", {
          requesterId: seedUsers[requesterIndex]._id,
          recipientId: seedUsers[recipientIndex]._id,
          status: "pending",
          proposedTime: requestData.proposedTime,
          proposedDuration: requestData.proposedDuration,
          location: requestData.location,
          message: requestData.message,
        });
      }
    }

    // Create pending requests TO the current user
    if (currentUser && users.length >= 2) {
      const currentUserRequests = [
        {
          fromUser: "Carol Davis",
          proposedTime: now + 2 * oneDay + 5 * oneHour,
          proposedDuration: 30,
          location: "Conference Room B",
          message:
            "Hi! I'd love to pick your brain about marketing strategies. Do you have time for a quick chat?",
        },
        {
          fromUser: "Emma Wilson",
          proposedTime: now + 3 * oneDay + oneHour,
          proposedDuration: 45,
          location: "Data Lab",
          message:
            "I noticed your interest in data analytics. Would you like to discuss how we could collaborate on a project?",
        },
      ];

      for (const requestData of currentUserRequests) {
        const requester = users.find((u) => u.name === requestData.fromUser);
        if (!requester) continue;

        await ctx.db.insert("meetingRequests", {
          requesterId: requester._id,
          recipientId: currentUser._id,
          status: "pending",
          proposedTime: requestData.proposedTime,
          proposedDuration: requestData.proposedDuration,
          location: requestData.location,
          message: requestData.message,
        });
      }
    }

    const totalMeetings = await ctx.db.query("meetings").collect();
    const totalParticipations = await ctx.db
      .query("meetingParticipants")
      .collect();
    const totalRequests = await ctx.db.query("meetingRequests").collect();

    return {
      success: true,
      summary: {
        meetingsCreated: totalMeetings.length,
        participationsCreated: totalParticipations.length,
        requestsCreated: totalRequests.length,
        includedCurrentUser: currentUser !== null,
      },
    };
  },
});

// Public mutation that calls the internal one with the current user's clerkId
export const seedDataWithCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();

    // Call the internal mutation with the current user's clerkId
    await ctx.scheduler.runAfter(
      0,
      internal.seed.seedData,
      identity ? { currentUserClerkId: identity.subject } : {}
    );
  },
});
