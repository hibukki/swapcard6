import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getMeetingById(
  ctx: QueryCtx | MutationCtx,
  meetingId: Id<"meetings">,
) {
  return await ctx.db.get(meetingId);
}

export async function getMeetingOrCrash(
  ctx: QueryCtx | MutationCtx,
  meetingId: Id<"meetings">,
) {
  const meeting = await ctx.db.get(meetingId);
  if (!meeting) {
    throw new ConvexError("Meeting not found");
  }
  return meeting;
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

export async function requireCreatorRole(
  ctx: QueryCtx | MutationCtx,
  meetingId: Id<"meetings">,
  userId: Id<"users">,
) {
  const participation = await getMeetingParticipation(ctx, meetingId, userId);
  if (!participation || participation.status !== "creator") {
    throw new ConvexError("Only the meeting creator can perform this action");
  }
  return participation;
}
