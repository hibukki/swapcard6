import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";
import { getMeetingById, getMeetingOrCrash } from "./meetingUtils";
import { meetingFields } from "./schema";
import { createNotification } from "./notifications";

const optionalMeetingFields = {
  title: v.optional(meetingFields.title),
  description: v.optional(meetingFields.description),
  scheduledTime: v.optional(meetingFields.scheduledTime),
  duration: v.optional(meetingFields.duration),
  location: v.optional(meetingFields.location),
  isPublic: v.optional(meetingFields.isPublic),
  maxParticipants: v.optional(meetingFields.maxParticipants),
  notes: v.optional(meetingFields.notes),
};

export const create = mutation({
  args: {
    title: meetingFields.title,
    description: meetingFields.description,
    scheduledTime: meetingFields.scheduledTime,
    duration: meetingFields.duration,
    location: meetingFields.location,
    isPublic: meetingFields.isPublic,
    maxParticipants: meetingFields.maxParticipants,
    addCurrentUserAs: v.optional(v.literal("creator")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    const { addCurrentUserAs, ...meetingData } = args;
    const meetingId = await ctx.db.insert("meetings", {
      ...meetingData,
      creatorId: user._id,
    });

    if (addCurrentUserAs === "creator") {
      await ctx.db.insert("meetingParticipants", {
        meetingId,
        userId: user._id,
        status: "creator",
      });
    }

    return meetingId;
  },
});

export const get = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    return await getMeetingById(ctx, args.meetingId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("meetings").withIndex("by_time").collect();
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();
  },
});

export const listByCreator = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .collect();
  },
});

export const update = mutation({
  args: {
    meetingId: v.id("meetings"),
    ...optionalMeetingFields,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (meeting.creatorId !== user._id) {
      throw new ConvexError("Only the creator can update this meeting");
    }

    if (args.duration !== undefined && args.duration <= 0) {
      throw new ConvexError("Duration must be greater than 0");
    }

    if (
      args.scheduledTime !== undefined &&
      (Number.isNaN(args.scheduledTime) || args.scheduledTime <= 0)
    ) {
      throw new ConvexError("Invalid scheduled time");
    }

    const { meetingId, ...updates } = args;
    await ctx.db.patch(meetingId, updates);
    return await getMeetingById(ctx, meetingId);
  },
});

export const listSharedWith = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    // Get all meeting participations for the target user
    const targetUserParticipations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all meeting participations for the current user
    const currentUserParticipations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", currentUser._id))
      .collect();

    const targetMeetingIds = new Set(
      targetUserParticipations
        .filter((p) => p.status === "creator" || p.status === "accepted")
        .map((p) => p.meetingId)
    );
    const currentUserMeetingIds = new Set(
      currentUserParticipations
        .filter((p) => p.status === "creator" || p.status === "accepted")
        .map((p) => p.meetingId)
    );

    // Find meetings both users are in
    const sharedMeetingIds = [...targetMeetingIds].filter((id) =>
      currentUserMeetingIds.has(id)
    );

    const meetings = await Promise.all(
      sharedMeetingIds.map((id) => ctx.db.get(id))
    );

    return meetings.filter((m) => m !== null);
  },
});

export const remove = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const meeting = await getMeetingOrCrash(ctx, args.meetingId);

    if (meeting.creatorId !== user._id) {
      throw new ConvexError("Only the creator can delete this meeting");
    }

    // Delete all participants first
    const participants = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    // Notify all participants (except creator) before deletion
    for (const p of participants) {
      if (p.userId !== user._id) {
        await createNotification(ctx, {
          userId: p.userId,
          type: "meeting_cancelled",
          relatedMeetingId: args.meetingId,
          relatedUserId: user._id,
        });
      }
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.meetingId);
  },
});

export const getBusySlots = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const participations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", args.userId))
      .collect();

    const busySlots: { start: number; end: number }[] = [];

    for (const p of participations) {
      if (p.status === "declined") continue;
      const meeting = await ctx.db.get(p.meetingId);
      if (!meeting) continue;

      const meetingEnd = meeting.scheduledTime + meeting.duration * 60000;
      if (meeting.scheduledTime < args.endDate && meetingEnd > args.startDate) {
        busySlots.push({ start: meeting.scheduledTime, end: meetingEnd });
      }
    }
    return busySlots;
  },
});
