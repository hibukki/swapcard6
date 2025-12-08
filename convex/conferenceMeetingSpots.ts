import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrCrash } from "./users";

export const listByConference = query({
  args: { conferenceId: v.id("conferences") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conferenceMeetingSpots")
      .withIndex("by_conference", (q) => q.eq("conferenceId", args.conferenceId))
      .collect();
  },
});

export const create = mutation({
  args: {
    conferenceId: v.id("conferences"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await getCurrentUserOrCrash(ctx);

    const conference = await ctx.db.get(args.conferenceId);
    if (!conference) {
      throw new ConvexError("Conference not found");
    }

    return await ctx.db.insert("conferenceMeetingSpots", {
      conferenceId: args.conferenceId,
      name: args.name,
    });
  },
});

export const remove = mutation({
  args: { spotId: v.id("conferenceMeetingSpots") },
  handler: async (ctx, args) => {
    await getCurrentUserOrCrash(ctx);

    const spot = await ctx.db.get(args.spotId);
    if (!spot) {
      throw new ConvexError("Meeting spot not found");
    }

    await ctx.db.delete(args.spotId);
  },
});
