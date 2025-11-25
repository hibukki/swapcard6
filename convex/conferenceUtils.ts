import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getConferenceById(
  ctx: QueryCtx | MutationCtx,
  conferenceId: Id<"conferences">,
) {
  return await ctx.db.get(conferenceId);
}

export async function getConferenceOrCrash(
  ctx: QueryCtx | MutationCtx,
  conferenceId: Id<"conferences">,
) {
  const conference = await ctx.db.get(conferenceId);
  if (!conference) {
    throw new ConvexError("Conference not found");
  }
  return conference;
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

export async function requireOrganizerRole(
  ctx: QueryCtx | MutationCtx,
  conferenceId: Id<"conferences">,
  userId: Id<"users">,
) {
  const attendance = await getConferenceAttendance(ctx, conferenceId, userId);
  if (!attendance || attendance.role !== "organizer") {
    throw new ConvexError("Only organizers can perform this action");
  }
  return attendance;
}
