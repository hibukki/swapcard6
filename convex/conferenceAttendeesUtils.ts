import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getConferenceAttendeeById(
  ctx: QueryCtx | MutationCtx,
  attendeeId: Id<"conferenceAttendees">,
) {
  return await ctx.db.get(attendeeId);
}

export async function getConferenceAttendance(
  ctx: QueryCtx | MutationCtx,
  conferenceId: Id<"conferences">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("conferenceAttendees")
    .withIndex("by_conference_and_user", (q) =>
      q.eq("conferenceId", conferenceId).eq("userId", userId)
    )
    .unique();
}
