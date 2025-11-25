import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash, getCurrentUserOrNull, getUserByIdOrCrash } from "./users";
import { getConferenceOrCrash } from "./conferenceUtils";
import { getConferenceAttendance } from "./conferenceAttendeesUtils";
import { conferenceAttendeeRoleValidator } from "./schema";

// Queries

export const get = query({
  args: { attendeeId: v.id("conferenceAttendees") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attendeeId);
  },
});

export const listByConference = query({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conferenceAttendees")
      .withIndex("by_conference", (q) => q.eq("conferenceId", args.conferenceId))
      .collect();
  },
});

export const listByAttendingUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conferenceAttendees")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listConferencesAttendedByCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    return await ctx.db
      .query("conferenceAttendees")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getCurrentUserAttendance = query({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    return await getConferenceAttendance(ctx, args.conferenceId, user._id);
  },
});

// Mutations

export const join = mutation({
  args: {
    conferenceId: v.id("conferences"),
    role: v.optional(v.union(v.literal("speaker"), v.literal("attendee"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    await getConferenceOrCrash(ctx, args.conferenceId);

    const existing = await getConferenceAttendance(ctx, args.conferenceId, user._id);
    if (existing) {
      throw new ConvexError("Already attending this conference");
    }

    return await ctx.db.insert("conferenceAttendees", {
      conferenceId: args.conferenceId,
      userId: user._id,
      role: args.role ?? "attendee",
    });
  },
});

export const leave = mutation({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const conference = await getConferenceOrCrash(ctx, args.conferenceId);

    const attendance = await getConferenceAttendance(ctx, args.conferenceId, user._id);
    if (!attendance) {
      throw new ConvexError("Not attending this conference");
    }

    if (conference.createdBy === user._id) {
      throw new ConvexError("Creator cannot leave their own conference. Delete it instead.");
    }

    await ctx.db.delete(attendance._id);
  },
});

export const updateRole = mutation({
  args: {
    conferenceId: v.id("conferences"),
    userId: v.id("users"),
    role: conferenceAttendeeRoleValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const conference = await getConferenceOrCrash(ctx, args.conferenceId);

    if (conference.createdBy !== user._id) {
      throw new ConvexError("Only the conference creator can change roles");
    }

    const targetAttendance = await getConferenceAttendance(ctx, args.conferenceId, args.userId);
    if (!targetAttendance) {
      throw new ConvexError("User is not attending this conference");
    }

    await ctx.db.patch(targetAttendance._id, { role: args.role });
  },
});

export const invite = mutation({
  args: {
    conferenceId: v.id("conferences"),
    userId: v.id("users"),
    role: v.optional(conferenceAttendeeRoleValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const conference = await getConferenceOrCrash(ctx, args.conferenceId);

    if (conference.createdBy !== user._id) {
      throw new ConvexError("Only the conference creator can invite attendees");
    }

    await getUserByIdOrCrash(ctx, args.userId);

    const existing = await getConferenceAttendance(ctx, args.conferenceId, args.userId);
    if (existing) {
      throw new ConvexError("User is already attending this conference");
    }

    return await ctx.db.insert("conferenceAttendees", {
      conferenceId: args.conferenceId,
      userId: args.userId,
      role: args.role ?? "attendee",
    });
  },
});

export const remove = mutation({
  args: {
    conferenceId: v.id("conferences"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);
    const conference = await getConferenceOrCrash(ctx, args.conferenceId);

    if (conference.createdBy !== user._id) {
      throw new ConvexError("Only the conference creator can remove attendees");
    }

    if (args.userId === user._id) {
      throw new ConvexError("Cannot remove yourself. Delete the conference instead.");
    }

    const attendance = await getConferenceAttendance(ctx, args.conferenceId, args.userId);
    if (!attendance) {
      throw new ConvexError("User is not attending this conference");
    }

    await ctx.db.delete(attendance._id);
  },
});
