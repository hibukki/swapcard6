import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const seedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Create sample users if they don't exist
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

    for (const userData of sampleUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userData.clerkId))
        .unique();

      if (!existing) {
        await ctx.db.insert("users", userData);
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
        .filter((q) =>
          q.and(
            q.eq(q.field("title"), template.title),
            q.eq(q.field("isPublic"), true)
          )
        )
        .first();

      if (!existing) {
        // Create the public meeting with a random user as creator
        const creator = allUsers[Math.floor(Math.random() * allUsers.length)];

        const meetingId = await ctx.db.insert("meetings", {
          creatorId: creator._id,
          title: template.title,
          description: template.description,
          scheduledTime: template.scheduledTime,
          duration: template.duration,
          location: template.location,
          isPublic: true,
          maxParticipants: template.maxParticipants,
        });

        publicMeetingIds.push(meetingId);

        // Add creator as participant
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: creator._id,
          role: "creator",
        });
      } else {
        publicMeetingIds.push(existing._id);
      }
    }

    // Now ensure each user has at least 4 public and 4 private meetings
    const privateMeetingTemplates = [
      { title: "1-on-1: Strategy Discussion", description: "Private discussion about project strategy and roadmap.", duration: 30, location: "Meeting Room 3" },
      { title: "Team Sync: Project Updates", description: "Quick sync on project progress and blockers.", duration: 45, location: "Conference Room A" },
      { title: "Client Meeting: Requirements Review", description: "Review client requirements and discuss next steps.", duration: 60, location: "Virtual - Zoom" },
      { title: "Coffee Chat", description: "Informal discussion over coffee.", duration: 30, location: "Cafe" },
      { title: "Brainstorming Session", description: "Creative brainstorming for new ideas.", duration: 45, location: "Innovation Lab" },
      { title: "Progress Check-in", description: "Review progress and next steps.", duration: 30, location: "Office" },
      { title: "Collaboration Meeting", description: "Discuss potential collaboration opportunities.", duration: 60, location: "Conference Room B" },
      { title: "Design Review", description: "Review design mockups and provide feedback.", duration: 60, location: "Design Studio" },
      { title: "Marketing Strategy Discussion", description: "Discuss marketing approach for upcoming quarter.", duration: 45, location: "Marketing Office" },
      { title: "Data Analysis Review", description: "Review latest analytics and insights.", duration: 60, location: "Data Lab" },
    ];

    for (const user of allUsers) {
      // Count existing meetings for this user
      const userParticipations = await ctx.db
        .query("meetingParticipants")
        .withIndex("by_user_only", (q) => q.eq("userId", user._id))
        .collect();

      let publicCount = 0;
      let privateCount = 0;

      for (const participation of userParticipations) {
        const meeting = await ctx.db.get(participation.meetingId);
        if (meeting) {
          if (meeting.isPublic) {
            publicCount++;
          } else {
            privateCount++;
          }
        }
      }

      // Add public meetings if needed (target: 4)
      const publicNeeded = Math.max(0, 4 - publicCount);
      if (publicNeeded > 0) {
        const shuffledPublic = [...publicMeetingIds].sort(() => Math.random() - 0.5);
        let added = 0;

        for (const meetingId of shuffledPublic) {
          if (added >= publicNeeded) break;

          // Check if already participating
          const existing = await ctx.db
            .query("meetingParticipants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", meetingId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

          if (!existing) {
            await ctx.db.insert("meetingParticipants", {
              meetingId,
              userId: user._id,
              role: "participant",
            });
            added++;
          }
        }
      }

      // Add private meetings if needed (target: 4)
      const privateNeeded = Math.max(0, 4 - privateCount);
      if (privateNeeded > 0) {
        for (let i = 0; i < privateNeeded; i++) {
          // Pick a random other user
          const otherUsers = allUsers.filter((u) => u._id !== user._id);
          if (otherUsers.length === 0) continue;

          const otherUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
          const template = privateMeetingTemplates[Math.floor(Math.random() * privateMeetingTemplates.length)];

          // Schedule in the next 7 days with random time
          const scheduledTime = now + Math.floor(Math.random() * 7) * oneDay + Math.floor(Math.random() * 12) * oneHour;

          const meetingId = await ctx.db.insert("meetings", {
            creatorId: user._id,
            title: template.title,
            description: template.description,
            scheduledTime,
            duration: template.duration,
            location: template.location,
            isPublic: false,
          });

          // Add both users as participants
          await ctx.db.insert("meetingParticipants", {
            meetingId,
            userId: user._id,
            role: "creator",
          });

          await ctx.db.insert("meetingParticipants", {
            meetingId,
            userId: otherUser._id,
            role: "participant",
          });
        }
      }
    }

    // Create some pending meeting requests between users
    const requestPairs: Array<[Id<"users">, Id<"users">]> = [];

    // Create 5 random request pairs
    for (let i = 0; i < 5; i++) {
      const requester = allUsers[Math.floor(Math.random() * allUsers.length)];
      const otherUsers = allUsers.filter((u) => u._id !== requester._id);
      if (otherUsers.length === 0) continue;

      const recipient = otherUsers[Math.floor(Math.random() * otherUsers.length)];

      // Check if request already exists
      const existingRequest = await ctx.db
        .query("meetingRequests")
        .filter((q) =>
          q.and(
            q.eq(q.field("requesterId"), requester._id),
            q.eq(q.field("recipientId"), recipient._id),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();

      if (!existingRequest) {
        await ctx.db.insert("meetingRequests", {
          requesterId: requester._id,
          recipientId: recipient._id,
          status: "pending",
          proposedTime: now + Math.floor(Math.random() * 5) * oneDay,
          proposedDuration: [30, 45, 60][Math.floor(Math.random() * 3)],
          location: ["Cafe", "Office", "Conference Room", "Virtual - Zoom"][Math.floor(Math.random() * 4)],
          message: "Would love to connect and discuss potential collaboration!",
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
        totalUsers: allUsers.length,
        totalMeetings: totalMeetings.length,
        totalParticipations: totalParticipations.length,
        totalRequests: totalRequests.length,
      },
    };
  },
});

// Public mutation that calls the internal one
export const seedDataWithCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    // Call the internal mutation (no need to pass current user anymore)
    await ctx.scheduler.runAfter(0, internal.seed.seedData, {});
  },
});
