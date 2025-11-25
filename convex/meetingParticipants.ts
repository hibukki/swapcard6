import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash, getCurrentUserOrNull, getUserByIdOrCrash } from "./users";
import { getMeetingOrCrash, getMeetingParticipation } from "./meetingUtils";
import { meetingFields } from "./schema";

// Queries

export const get = query({
  args: { participationId: v.id("meetingParticipants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.participationId);
  },
});

export const listByMeeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetingParticipants")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = args.userId
      ? await ctx.db.get(args.userId)
      : await getCurrentUserOrNull(ctx);

    if (!user) return [];

    return await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getMyParticipation = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    return await getMeetingParticipation(ctx, args.meetingId, user._id);
  },
});

// Mutations

export const sendRequest = mutation({
  args: {
    recipientId: v.id("users"),
    title: meetingFields.title,
    description: meetingFields.description,
    scheduledTime: meetingFields.scheduledTime,
    duration: meetingFields.duration,
    location: meetingFields.location,
  },
  handler: async (ctx, args) => {
    const requester = await getCurrentUserOrCrash(ctx);
    await getUserByIdOrCrash(ctx, args.recipientId);

    if (args.recipientId === requester._id) {
      throw new ConvexError("Cannot send a meeting request to yourself");
    }

    // Create the meeting
    const meetingId = await ctx.db.insert("meetings", {
      creatorId: requester._id,
      title: args.title,
      description: args.description,
      scheduledTime: args.scheduledTime,
      duration: args.duration,
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
    const participationId = await ctx.db.insert("meetingParticipants", {
      meetingId,
      userId: args.recipientId,
      status: "pending",
    });

    return { meetingId, participationId };
  },
});

export const respond = mutation({
  args: {
    meetingId: v.id("meetings"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    await getMeetingOrCrash(ctx, args.meetingId);

    const participation = await getMeetingParticipation(ctx, args.meetingId, user._id);

    if (!participation) {
      throw new ConvexError("You are not invited to this meeting");
    }

    if (participation.status !== "pending") {
      throw new ConvexError("You have already responded to this invitation");
    }

    await ctx.db.patch(participation._id, {
      status: args.accept ? "accepted" : "declined",
    });
  },
});

export const join = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (!meeting.isPublic) {
      throw new ConvexError("This meeting is not public");
    }

    const existingParticipation = await getMeetingParticipation(ctx, args.meetingId, user._id);

    if (existingParticipation) {
      if (existingParticipation.status === "accepted" || existingParticipation.status === "creator") {
        throw new ConvexError("You are already a participant of this meeting");
      } else if (existingParticipation.status === "declined") {
        // Re-accept if previously declined
        await ctx.db.patch(existingParticipation._id, { status: "accepted" });
        return existingParticipation._id;
      }
    }

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

    return await ctx.db.insert("meetingParticipants", {
      meetingId: args.meetingId,
      userId: user._id,
      status: "accepted",
    });
  },
});

export const leave = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (meeting.creatorId === user._id) {
      throw new ConvexError("Creator cannot leave their own meeting. Delete it instead.");
    }

    const participation = await getMeetingParticipation(ctx, args.meetingId, user._id);

    if (!participation) {
      throw new ConvexError("You are not a participant of this meeting");
    }

    await ctx.db.delete(participation._id);
  },
});

export const invite = mutation({
  args: {
    meetingId: v.id("meetings"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (meeting.creatorId !== currentUser._id) {
      throw new ConvexError("Only the meeting creator can invite participants");
    }

    const existingParticipation = await getMeetingParticipation(ctx, args.meetingId, args.userId);
    if (existingParticipation) {
      throw new ConvexError("User is already invited to this meeting");
    }

    await getUserByIdOrCrash(ctx, args.userId);

    return await ctx.db.insert("meetingParticipants", {
      meetingId: args.meetingId,
      userId: args.userId,
      status: "pending",
    });
  },
});

export const remove = mutation({
  args: {
    meetingId: v.id("meetings"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (meeting.creatorId !== currentUser._id) {
      throw new ConvexError("Only the meeting creator can remove participants");
    }

    if (args.userId === currentUser._id) {
      throw new ConvexError("Cannot remove yourself. Delete the meeting instead.");
    }

    const participation = await getMeetingParticipation(ctx, args.meetingId, args.userId);
    if (!participation) {
      throw new ConvexError("User is not a participant of this meeting");
    }

    await ctx.db.delete(participation._id);
  },
});
