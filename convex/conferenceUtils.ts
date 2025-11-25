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
