import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendMeetingRequest = mutation({
  args: {
    recipientId: v.id("users"),
    proposedTime: v.optional(v.number()),
    proposedDuration: v.optional(v.number()),
    location: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const requester = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!requester) {
      throw new ConvexError("User not found");
    }

    // Check if a request already exists
    const existingRequest = await ctx.db
      .query("meetingRequests")
      .withIndex("by_requester", (q) =>
        q.eq("requesterId", requester._id).eq("status", "pending")
      )
      .collect();

    const hasPendingRequest = existingRequest.some(
      (r) => r.recipientId === args.recipientId
    );

    if (hasPendingRequest) {
      throw new ConvexError("You already have a pending request with this user");
    }

    const requestId = await ctx.db.insert("meetingRequests", {
      requesterId: requester._id,
      recipientId: args.recipientId,
      status: "pending",
      proposedTime: args.proposedTime,
      proposedDuration: args.proposedDuration ?? 30,
      location: args.location,
      message: args.message,
    });

    return requestId;
  },
});

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { sent: [], received: [] };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return { sent: [], received: [] };

    const sentRequests = await ctx.db
      .query("meetingRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .collect();

    const receivedRequests = await ctx.db
      .query("meetingRequests")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const enrichSent = await Promise.all(
      sentRequests.map(async (req) => ({
        ...req,
        recipient: await ctx.db.get(req.recipientId),
      }))
    );

    const enrichReceived = await Promise.all(
      receivedRequests.map(async (req) => ({
        ...req,
        requester: await ctx.db.get(req.requesterId),
      }))
    );

    return { sent: enrichSent, received: enrichReceived };
  },
});

export const respondToRequest = mutation({
  args: {
    requestId: v.id("meetingRequests"),
    accept: v.boolean(),
    scheduledTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    if (request.recipientId !== user._id) {
      throw new ConvexError("Not authorized");
    }

    if (request.status !== "pending") {
      throw new ConvexError("Request already responded to");
    }

    if (args.accept) {
      const scheduledTime = args.scheduledTime ?? request.proposedTime ?? Date.now();
      const duration = args.duration ?? request.proposedDuration ?? 30;
      const requester = await ctx.db.get(request.requesterId);

      const meetingId = await ctx.db.insert("meetings", {
        requestId: args.requestId,
        creatorId: request.requesterId,
        title: `Meeting with ${requester?.name ?? "attendee"}`,
        scheduledTime,
        duration,
        location: args.location ?? request.location,
        isPublic: false,
      });

      // Add both participants
      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: request.requesterId,
        role: "creator",
      });

      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: request.recipientId,
        role: "participant",
      });

      await ctx.db.patch(args.requestId, { status: "accepted" });
    } else {
      await ctx.db.patch(args.requestId, { status: "rejected" });
    }
  },
});

export const getMyMeetings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    // Get all meetings where user is a participant
    const participations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", user._id))
      .collect();

    const enriched = await Promise.all(
      participations.map(async (participation) => {
        const meeting = await ctx.db.get(participation.meetingId);
        if (!meeting) return null;

        // Get all participants for this meeting
        const allParticipations = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const participants = await Promise.all(
          allParticipations.map(async (p) => {
            const u = await ctx.db.get(p.userId);
            return u ? { ...u, role: p.role } : null;
          })
        );

        return {
          ...meeting,
          participants: participants.filter((p) => p !== null),
          userRole: participation.role,
        };
      })
    );

    const filtered = enriched.filter((m) => m !== null);
    return filtered.sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

// Create a public meeting
export const createMeeting = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(),
    location: v.optional(v.string()),
    isPublic: v.boolean(),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const meetingId = await ctx.db.insert("meetings", {
      creatorId: user._id,
      title: args.title,
      description: args.description,
      scheduledTime: args.scheduledTime,
      duration: args.duration,
      location: args.location,
      isPublic: args.isPublic,
      maxParticipants: args.maxParticipants,
    });

    // Add creator as a participant
    await ctx.db.insert("meetingParticipants", {
      meetingId,
      userId: user._id,
      role: "creator",
    });

    return meetingId;
  },
});

// List all public meetings
export const getPublicMeetings = query({
  args: {},
  handler: async (ctx) => {
    const publicMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    const enriched = await Promise.all(
      publicMeetings.map(async (meeting) => {
        const creator = await ctx.db.get(meeting.creatorId);

        // Count current participants
        const participations = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const participants = await Promise.all(
          participations.map(async (p) => {
            const u = await ctx.db.get(p.userId);
            return u ? { ...u, role: p.role } : null;
          })
        );

        const filteredParticipants = participants.filter((p) => p !== null);
        const isFull = meeting.maxParticipants
          ? filteredParticipants.length >= meeting.maxParticipants
          : false;

        return {
          ...meeting,
          creator,
          participants: filteredParticipants,
          participantCount: filteredParticipants.length,
          isFull,
        };
      })
    );

    return enriched.sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

// Join a public meeting
export const joinMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new ConvexError("Meeting not found");
    }

    if (!meeting.isPublic) {
      throw new ConvexError("This meeting is not public");
    }

    // Check if already joined
    const existingParticipation = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id).eq("meetingId", args.meetingId)
      )
      .unique();

    if (existingParticipation) {
      throw new ConvexError("You are already a participant of this meeting");
    }

    // Check if meeting is full
    if (meeting.maxParticipants) {
      const currentParticipants = await ctx.db
        .query("meetingParticipants")
        .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
        .collect();

      if (currentParticipants.length >= meeting.maxParticipants) {
        throw new ConvexError("This meeting is full");
      }
    }

    await ctx.db.insert("meetingParticipants", {
      meetingId: args.meetingId,
      userId: user._id,
      role: "participant",
    });

    return args.meetingId;
  },
});

// Leave a meeting
export const leaveMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new ConvexError("Meeting not found");
    }

    if (meeting.creatorId === user._id) {
      throw new ConvexError("Creator cannot leave their own meeting. Delete it instead.");
    }

    const participation = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id).eq("meetingId", args.meetingId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("You are not a participant of this meeting");
    }

    await ctx.db.delete(participation._id);
  },
});
