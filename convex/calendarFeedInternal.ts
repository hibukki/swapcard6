import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { generateICSFeed } from "./calendarFeed";

export const getCalendarFeed = internalQuery({
  args: { token: v.string(), baseUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_calendarToken", (q) => q.eq("calendarToken", args.token))
      .unique();

    if (!user) {
      return null;
    }

    const participations = await ctx.db
      .query("meetingParticipants")
      .withIndex("by_user_only", (q) => q.eq("userId", user._id))
      .collect();

    const relevantParticipations = participations.filter(
      (p) => p.status === "creator" || p.status === "accepted"
    );

    const meetingsWithDetails = await Promise.all(
      relevantParticipations.map(async (p) => {
        const meeting = await ctx.db.get(p.meetingId);
        if (!meeting) return null;

        const creator = await ctx.db.get(meeting.creatorId);

        const allParticipants = await ctx.db
          .query("meetingParticipants")
          .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
          .collect();

        const attendees = await Promise.all(
          allParticipants.map(async (participant) => {
            const participantUser = await ctx.db.get(participant.userId);
            return {
              name: participantUser?.name ?? "Unknown",
              email: participantUser?.email ?? "unknown@opencon.local",
              status: participant.status,
            };
          })
        );

        return {
          meeting,
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "noreply@opencon.local",
          attendees,
        };
      })
    );

    const validMeetings = meetingsWithDetails.filter(
      (m): m is NonNullable<typeof m> => m !== null
    );

    const icsContent = generateICSFeed(validMeetings, args.baseUrl);

    return { icsContent };
  },
});
