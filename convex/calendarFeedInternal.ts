import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { generateICSFeed } from "./calendarFeed";

export const getCalendarFeed = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Find user by calendar token
    const user = await ctx.db
      .query("users")
      .withIndex("by_calendarToken", (q) => q.eq("calendarToken", args.token))
      .unique();

    if (!user) {
      return null;
    }

    // Get all meeting participations for this user
    const participations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", user._id))
      .collect();

    // Filter to only creator or accepted status
    const relevantParticipations = participations.filter(
      (p) => p.status === "creator" || p.status === "accepted"
    );

    // Get all meetings with creator details
    const meetingsWithDetails = await Promise.all(
      relevantParticipations.map(async (p) => {
        const meeting = await ctx.db.get(p.meetingId);
        if (!meeting) return null;

        const creator = await ctx.db.get(meeting.creatorId);

        return {
          meeting,
          creatorName: creator?.name ?? "Unknown",
        };
      })
    );

    const validMeetings = meetingsWithDetails.filter(
      (m): m is NonNullable<typeof m> => m !== null
    );

    const icsContent = generateICSFeed(validMeetings);

    return { icsContent };
  },
});
