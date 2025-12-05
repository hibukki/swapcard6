import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrNull } from "./users";
import { getMeetingParticipation } from "./meetingParticipantsUtils";

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

/**
 * Get a meeting only if the user has permission to view it.
 * User can view if: meeting is public, or user is a participant.
 */
export async function getViewableMeetingOrCrash(
  ctx: QueryCtx,
  meetingId: Id<"meetings">,
) {
  const meeting = await getMeetingOrCrash(ctx, meetingId);

  if (!meeting.isPublic) {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authorized to view this meeting");
    }

    const participation = await getMeetingParticipation(ctx, meetingId, user._id);
    if (!participation) {
      throw new ConvexError("Not authorized to view this meeting");
    }
  }

  return meeting;
}
