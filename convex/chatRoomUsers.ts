import { query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCurrentUserOrCrash } from "./users";

export const listByRoom = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    // Verify current user is a participant
    const membership = await ctx.db
      .query("chatRoomUsers")
      .withIndex("by_chatRoom_and_user", (q) =>
        q.eq("chatRoomId", args.chatRoomId).eq("userId", currentUser._id),
      )
      .unique();

    if (!membership) {
      throw new ConvexError("Not a participant of this chat room");
    }

    // Get all participants
    const memberships = await ctx.db
      .query("chatRoomUsers")
      .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();

    // Fetch user details for each participant
    const users = await Promise.all(
      memberships.map(async (m) => await ctx.db.get(m.userId)),
    );

    return users.filter((u) => u !== null);
  },
});
