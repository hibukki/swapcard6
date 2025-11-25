import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";
import { getMeetingById, getMeetingOrCrash } from "./meetingUtils";
import { meetingFields } from "./schema";

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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    return await ctx.db.insert("meetings", {
      ...args,
      creatorId: user._id,
    });
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

    const { meetingId, ...updates } = args;
    await ctx.db.patch(meetingId, updates);
    return await getMeetingById(ctx, meetingId);
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

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.meetingId);
  },
});
