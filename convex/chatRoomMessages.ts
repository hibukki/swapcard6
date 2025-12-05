import { mutation, query } from "./_generated/server";
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

    // Get messages ordered by creation time (oldest first)
    const messages = await ctx.db
      .query("chatRoomMessages")
      .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();

    return messages;
  },
});

export const send = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    content: v.string(),
    parentMessageId: v.optional(v.id("chatRoomMessages")),
  },
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

    // Verify parent message exists and is in the same room (if provided)
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage || parentMessage.chatRoomId !== args.chatRoomId) {
        throw new ConvexError("Invalid parent message");
      }
    }

    // Insert message
    const messageId = await ctx.db.insert("chatRoomMessages", {
      chatRoomId: args.chatRoomId,
      senderId: currentUser._id,
      content: args.content,
      parentMessageId: args.parentMessageId,
    });

    // Update room's lastMessageAt
    await ctx.db.patch(args.chatRoomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});
