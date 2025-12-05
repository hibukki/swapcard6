import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Check if any other participant is a demo bot and trigger reply
    const roomUsers = await ctx.db
      .query("chatRoomUsers")
      .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();

    for (const roomUser of roomUsers) {
      if (roomUser.userId === currentUser._id) continue;

      const otherUser = await ctx.db.get(roomUser.userId);
      if (otherUser?.isDemoBot) {
        await ctx.scheduler.runAfter(
          500,
          internal.chatRoomMessages.demoBotReply,
          {
            chatRoomId: args.chatRoomId,
            botUserId: roomUser.userId,
            triggerMessageLength: args.content.length,
          },
        );
      }
    }

    return messageId;
  },
});

export const demoBotReply = internalMutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    botUserId: v.id("users"),
    triggerMessageLength: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Deterministic action based on message length mod 5
    // 0 = do nothing
    // 1 = "I feel like messaging you too"
    // 2 = reply to a random message with "I feel like replying to this message"
    // 3 = two messages: "Hey there" then "actually I have more to say"
    // 4 = do nothing (alternate quiet option)
    const action = args.triggerMessageLength % 5;

    if (action === 0 || action === 4) {
      return;
    }

    if (action === 1) {
      await ctx.db.insert("chatRoomMessages", {
        chatRoomId: args.chatRoomId,
        senderId: args.botUserId,
        content: "I feel like messaging you too",
      });
      await ctx.db.patch(args.chatRoomId, { lastMessageAt: now });
    } else if (action === 2) {
      const messages = await ctx.db
        .query("chatRoomMessages")
        .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", args.chatRoomId))
        .collect();

      if (messages.length > 0) {
        const randomIndex = args.triggerMessageLength % messages.length;
        const parentMessage = messages[randomIndex];

        await ctx.db.insert("chatRoomMessages", {
          chatRoomId: args.chatRoomId,
          senderId: args.botUserId,
          content: "I feel like replying to this message",
          parentMessageId: parentMessage._id,
        });
        await ctx.db.patch(args.chatRoomId, { lastMessageAt: now });
      }
    } else if (action === 3) {
      await ctx.db.insert("chatRoomMessages", {
        chatRoomId: args.chatRoomId,
        senderId: args.botUserId,
        content: "Hey there",
      });

      await ctx.scheduler.runAfter(
        300,
        internal.chatRoomMessages.demoBotSendFollowUp,
        {
          chatRoomId: args.chatRoomId,
          botUserId: args.botUserId,
          content: "actually I have more to say",
        },
      );

      await ctx.db.patch(args.chatRoomId, { lastMessageAt: now });
    }
  },
});

export const demoBotSendFollowUp = internalMutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    botUserId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatRoomMessages", {
      chatRoomId: args.chatRoomId,
      senderId: args.botUserId,
      content: args.content,
    });
    await ctx.db.patch(args.chatRoomId, { lastMessageAt: Date.now() });
  },
});
