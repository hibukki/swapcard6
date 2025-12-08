import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";
import { getConferenceById, getConferenceOrCrash } from "./conferenceUtils";
import { conferenceFields } from "./schema";
import { Id } from "./_generated/dataModel";

const optionalConferenceFields = {
  name: v.optional(conferenceFields.name),
  description: v.optional(conferenceFields.description),
  startDate: v.optional(conferenceFields.startDate),
  endDate: v.optional(conferenceFields.endDate),
  timezone: v.optional(conferenceFields.timezone),
  location: v.optional(conferenceFields.location),
  imageUrl: v.optional(conferenceFields.imageUrl),
  websiteUrl: v.optional(conferenceFields.websiteUrl),
};

export const create = mutation({
  args: conferenceFields,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    if (args.endDate < args.startDate) {
      throw new ConvexError("End date must be after start date");
    }

    return await ctx.db.insert("conferences", {
      ...args,
      createdBy: user._id,
    });
  },
});

export const get = query({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    return await getConferenceById(ctx, args.conferenceId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("conferences")
      .withIndex("by_start_date")
      .collect();
  },
});

const getEditableConferenceOrCrash = async (
  ctx: QueryCtx | MutationCtx,
  conferenceId: Id<"conferences">,
) => {
  const conference = await getConferenceOrCrash(ctx, conferenceId);

  // For now, anyone can edit a conference

  return conference;
};
export const update = mutation({
  args: {
    conferenceId: v.id("conferences"),
    ...optionalConferenceFields,
  },
  handler: async (ctx, args) => {
    await getEditableConferenceOrCrash(ctx, args.conferenceId);

    const { conferenceId, ...updates } = args;
    await ctx.db.patch(conferenceId, updates);
    return await getConferenceById(ctx, conferenceId);
  },
});

export const remove = mutation({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    await getEditableConferenceOrCrash(ctx, args.conferenceId);

    // Delete all attendees
    const attendees = await ctx.db
      .query("conferenceAttendees")
      .withIndex("by_conference", (q) =>
        q.eq("conferenceId", args.conferenceId),
      )
      .collect();

    for (const a of attendees) {
      await ctx.db.delete(a._id);
    }

    // Delete all meeting spots
    const meetingSpots = await ctx.db
      .query("conferenceMeetingSpots")
      .withIndex("by_conference", (q) =>
        q.eq("conferenceId", args.conferenceId),
      )
      .collect();

    for (const spot of meetingSpots) {
      await ctx.db.delete(spot._id);
    }

    await ctx.db.delete(args.conferenceId);
  },
});
