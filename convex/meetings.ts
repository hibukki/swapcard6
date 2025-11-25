import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUserOrNull,
  getUserById,
  getUserByIdOrCrash,
} from "./users";

// Send meeting request - creates meeting with requester as creator and recipient as pending
export const sendMeetingRequest = mutation({
  args: {
    recipientId: v.id("users"),
    proposedTime: v.optional(v.number()),
    proposedDuration: v.optional(v.number()),
    location: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await getCurrentUserOrNull(ctx);
    if (!requester) {
      throw new ConvexError("Not authenticated");
    }

    const recipient = await getUserByIdOrCrash(ctx, args.recipientId);

    // Check if a pending request already exists between these users
    const existingParticipations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", requester._id).eq("status", "creator")
      )
      .collect();

    for (const participation of existingParticipations) {
      const meeting = await ctx.db.get(participation.meetingId);
      if (!meeting || meeting.isPublic) continue;

      // Check if recipient is pending in this meeting
      const recipientParticipation = await ctx.db
        .query("meetingParticipants")
        .withIndex("by_user", (q) =>
          q.eq("userId", args.recipientId).eq("meetingId", meeting._id)
        )
        .unique();

      if (recipientParticipation && recipientParticipation.status === "pending") {
        throw new ConvexError("You already have a pending request with this user");
      }
    }

    // Create the meeting
    const meetingId = await ctx.db.insert("meetings", {
      creatorId: requester._id,
      title: `Meeting with ${recipient.name}`,
      description: args.message,
      scheduledTime: args.proposedTime ?? Date.now() + 24 * 60 * 60 * 1000, // default to tomorrow
      duration: args.proposedDuration ?? 30,
      location: args.location,
      isPublic: false,
    });

    // Add requester as creator
    await ctx.db.insert("meetingParticipants", {
      meetingId,
      userId: requester._id,
      status: "creator",
    });

    // Add recipient as pending
    await ctx.db.insert("meetingParticipants", {
      meetingId,
      userId: args.recipientId,
      status: "pending",
    });

    return meetingId;
  },
});

// Get meetings where user has pending invitations (received requests)
export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get all pending participations
    const pendingParticipations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending")
      )
      .collect();

    const enriched = await Promise.all(
      pendingParticipations.map(async (participation) => {
        const meeting = await ctx.db.get(participation.meetingId);
        if (!meeting) return null;

        const creator = await getUserById(ctx, meeting.creatorId);

        return {
          ...meeting,
          participationId: participation._id,
          requester: creator,
        };
      })
    );

    return enriched.filter((m) => m !== null).sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

// Get meetings the user has sent (where they are creator and others are pending)
export const getSentRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get all meetings where user is creator
    const creatorParticipations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "creator")
      )
      .collect();

    const enriched = await Promise.all(
      creatorParticipations.map(async (participation) => {
        const meeting = await ctx.db.get(participation.meetingId);
        if (!meeting || meeting.isPublic) return null;

        // Get all participants to find pending ones
        const allParticipations = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const pendingParticipations = allParticipations.filter(
          (p) => p.status === "pending"
        );

        if (pendingParticipations.length === 0) return null; // No pending invites

        const recipients = await Promise.all(
          pendingParticipations.map((p) => getUserById(ctx, p.userId))
        );

        return {
          ...meeting,
          recipients: recipients.filter((r) => r !== null),
        };
      })
    );

    return enriched.filter((m) => m !== null).sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

// Respond to meeting invitation
export const respondToInvitation = mutation({
  args: {
    meetingId: v.id("meetings"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new ConvexError("Meeting not found");
    }

    const participation = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id).eq("meetingId", args.meetingId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("You are not invited to this meeting");
    }

    if (participation.status !== "pending") {
      throw new ConvexError("You have already responded to this invitation");
    }

    if (args.accept) {
      await ctx.db.patch(participation._id, { status: "accepted" });
    } else {
      await ctx.db.patch(participation._id, { status: "declined" });
    }
  },
});

// Get all user's meetings (accepted + creator, excluding pending and declined)
export const getMyMeetings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get all participations where status is creator or accepted
    const participations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", user._id))
      .collect();

    const acceptedParticipations = participations.filter(
      (p) => p.status === "creator" || p.status === "accepted"
    );

    const enriched = await Promise.all(
      acceptedParticipations.map(async (participation) => {
        const meeting = await ctx.db.get(participation.meetingId);
        if (!meeting) return null;

        // Get all accepted/creator participants for this meeting
        const allParticipations = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const activeParticipations = allParticipations.filter(
          (p) => p.status === "creator" || p.status === "accepted"
        );

        const participants = await Promise.all(
          activeParticipations.map(async (p) => {
            const u = await getUserById(ctx, p.userId);
            return u ? { ...u, role: p.status } : null;
          })
        );

        return {
          ...meeting,
          participants: participants.filter((p) => p !== null),
          userRole: participation.status,
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
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

    // Add creator as a participant with creator status
    await ctx.db.insert("meetingParticipants", {
      meetingId,
      userId: user._id,
      status: "creator",
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
        const creator = await getUserById(ctx, meeting.creatorId);

        // Count current participants (only accepted and creator)
        const participations = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const activeParticipations = participations.filter(
          (p) => p.status === "creator" || p.status === "accepted"
        );

        const participants = await Promise.all(
          activeParticipations.map(async (p) => {
            const u = await getUserById(ctx, p.userId);
            return u ? { ...u, role: p.status } : null;
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
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
      if (existingParticipation.status === "accepted" || existingParticipation.status === "creator") {
        throw new ConvexError("You are already a participant of this meeting");
      } else if (existingParticipation.status === "declined") {
        // Re-accept if previously declined
        await ctx.db.patch(existingParticipation._id, { status: "accepted" });
        return args.meetingId;
      }
    }

    // Check if meeting is full (only count accepted + creator)
    if (meeting.maxParticipants) {
      const currentParticipants = await ctx.db
        .query("meetingParticipants")
        .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
        .collect();

      const activeCount = currentParticipants.filter(
        (p) => p.status === "accepted" || p.status === "creator"
      ).length;

      if (activeCount >= meeting.maxParticipants) {
        throw new ConvexError("This meeting is full");
      }
    }

    await ctx.db.insert("meetingParticipants", {
      meetingId: args.meetingId,
      userId: user._id,
      status: "accepted",
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
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
