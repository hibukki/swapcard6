import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getMeetingParticipantById(
  ctx: QueryCtx | MutationCtx,
  participantId: Id<"meetingParticipants">,
) {
  return await ctx.db.get(participantId);
}

export async function getMeetingParticipation(
  ctx: QueryCtx | MutationCtx,
  meetingId: Id<"meetings">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("meetingParticipants")
    .withIndex("by_user", (q) =>
      q.eq("userId", userId).eq("meetingId", meetingId)
    )
    .unique();
}
