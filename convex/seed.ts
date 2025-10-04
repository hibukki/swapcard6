import { internalMutation } from "./_generated/server";

export const seedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data (optional - comment out if you want to keep existing data)
    const existingMeetings = await ctx.db.query("meetings").collect();
    const existingParticipants = await ctx.db
      .query("meetingParticipants")
      .collect();
    const existingRequests = await ctx.db.query("meetingRequests").collect();

    for (const participant of existingParticipants) {
      await ctx.db.delete(participant._id);
    }
    for (const meeting of existingMeetings) {
      await ctx.db.delete(meeting._id);
    }
    for (const request of existingRequests) {
      await ctx.db.delete(request._id);
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    if (users.length < 2) {
      throw new Error(
        "Need at least 2 users to seed data. Please sign up with at least 2 accounts first."
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

    // Create public meetings with participants
    for (const meetingData of publicMeetings) {
      const creatorIndex = Math.floor(Math.random() * users.length);
      const creator = users[creatorIndex];

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

      // Add some random participants (2-5 participants per meeting)
      const numParticipants = Math.floor(Math.random() * 4) + 2;
      const availableUsers = users.filter((u) => u._id !== creator._id);

      for (let i = 0; i < Math.min(numParticipants, availableUsers.length); i++) {
        const participant = availableUsers[i];
        await ctx.db.insert("meetingParticipants", {
          meetingId,
          userId: participant._id,
          role: "participant",
        });
      }
    }

    // Create some private meetings between users
    if (users.length >= 2) {
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
        const creatorIndex = Math.floor(Math.random() * users.length);
        const creator = users[creatorIndex];
        const participantIndex = (creatorIndex + 1) % users.length;
        const participant = users[participantIndex];

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

    // Create some pending meeting requests
    if (users.length >= 3) {
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
        const requesterIndex = Math.floor(Math.random() * users.length);
        const recipientIndex = (requesterIndex + 1) % users.length;

        await ctx.db.insert("meetingRequests", {
          requesterId: users[requesterIndex]._id,
          recipientId: users[recipientIndex]._id,
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
      },
    };
  },
});
