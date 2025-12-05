import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrCrash } from "./users";

/**
 * Verify that a user is a participant of a chat room.
 * Throws ConvexError if the user is not a participant.
 */
export async function requireChatRoomMembership(
  ctx: QueryCtx | MutationCtx,
  chatRoomId: Id<"chatRooms">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("chatRoomUsers")
    .withIndex("by_chatRoom_and_user", (q) =>
      q.eq("chatRoomId", chatRoomId).eq("userId", userId),
    )
    .unique();

  if (!membership) {
    throw new ConvexError("Not a participant of this chat room");
  }

  return membership;
}

export const listByRoom = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    // Verify current user is a participant
    await requireChatRoomMembership(ctx, args.chatRoomId, currentUser._id);

    // Get all participants (return chatRoomUsers, not full user objects)
    const memberships = await ctx.db
      .query("chatRoomUsers")
      .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();

    return memberships;
  },
});
