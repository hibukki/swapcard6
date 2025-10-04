import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Get all chats for the current user
export const getUserChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get all chat participations for this user
    const participations = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get chat details with participant info
    const chats = await Promise.all(
      participations.map(async (participation) => {
        const chat = await ctx.db.get(participation.chatId);
        if (!chat) return null;

        // Get all participants
        const allParticipants = await ctx.db
          .query("chatParticipants")
          .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
          .collect();

        // Get participant user details
        const participants = await Promise.all(
          allParticipants.map(async (p) => {
            const participantUser = await ctx.db.get(p.userId);
            return participantUser;
          })
        );

        // Get last message for preview
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
          .order("desc")
          .first();

        return {
          ...chat,
          participants: participants.filter((p) => p !== null),
          lastMessage,
        };
      })
    );

    return chats.filter((c) => c !== null).sort((a, b) => {
      const aTime = a.lastMessage?._creationTime ?? a._creationTime;
      const bTime = b.lastMessage?._creationTime ?? b._creationTime;
      return bTime - aTime;
    });
  },
});

// Get a single chat by ID
export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const chat = await ctx.db.get(chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }

    // Verify user is a participant
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to view this chat");
    }

    // Get all participants
    const allParticipants = await ctx.db
      .query("chatParticipants")
      .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
      .collect();

    const participants = await Promise.all(
      allParticipants.map(async (p) => {
        const participantUser = await ctx.db.get(p.userId);
        return participantUser;
      })
    );

    return {
      ...chat,
      participants: participants.filter((p) => p !== null),
    };
  },
});

// Get messages for a chat
export const getChatMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify user is a participant
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to view this chat");
    }

    // Get all top-level messages (no parent)
    const topLevelMessages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("parentMessageId"), undefined))
      .collect();

    // For each message, get author, reactions, and replies
    const messagesWithDetails = await Promise.all(
      topLevelMessages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);

        // Get reactions
        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Get replies
        const replies = await ctx.db
          .query("messages")
          .withIndex("by_parent", (q) => q.eq("parentMessageId", message._id))
          .collect();

        const repliesWithDetails = await Promise.all(
          replies.map(async (reply) => {
            const replyAuthor = await ctx.db.get(reply.authorId);
            const replyReactions = await ctx.db
              .query("messageReactions")
              .withIndex("by_message", (q) => q.eq("messageId", reply._id))
              .collect();

            return {
              ...reply,
              author: replyAuthor,
              reactions: replyReactions,
            };
          })
        );

        return {
          ...message,
          author,
          reactions,
          replies: repliesWithDetails,
        };
      })
    );

    return messagesWithDetails;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { chatId, content, parentMessageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify user is a participant
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to send messages to this chat");
    }

    // If replying, verify parent message exists and is in the same chat
    if (parentMessageId) {
      const parentMessage = await ctx.db.get(parentMessageId);
      if (!parentMessage) {
        throw new ConvexError("Parent message not found");
      }
      if (parentMessage.chatId !== chatId) {
        throw new ConvexError("Parent message is not in this chat");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      chatId,
      authorId: user._id,
      content,
      parentMessageId,
    });

    return messageId;
  },
});

// Add a reaction to a message
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new ConvexError("Message not found");
    }

    // Verify user is a participant of the chat
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", message.chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to react to this message");
    }

    // Check if user already reacted with this emoji
    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", user._id).eq("messageId", messageId)
      )
      .filter((q) => q.eq(q.field("emoji"), emoji))
      .first();

    if (existingReaction) {
      // Remove the reaction if it already exists (toggle)
      await ctx.db.delete(existingReaction._id);
      return null;
    }

    // Add the reaction
    const reactionId = await ctx.db.insert("messageReactions", {
      messageId,
      userId: user._id,
      emoji,
    });

    return reactionId;
  },
});

// Find or create a chat between specific users
export const findOrCreateChat = mutation({
  args: {
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, { participantIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Add current user to participants if not already included
    const allParticipantIds = participantIds.includes(user._id)
      ? participantIds
      : [...participantIds, user._id];

    if (allParticipantIds.length < 2) {
      throw new ConvexError("A chat needs at least 2 participants");
    }

    // For 1-on-1 chats, check if one already exists
    if (allParticipantIds.length === 2) {
      // Get all chats where current user is a participant
      const userChats = await ctx.db
        .query("chatParticipants")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      // Check each chat to see if it's a 1-on-1 with the other user
      for (const participation of userChats) {
        const chat = await ctx.db.get(participation.chatId);
        if (!chat || chat.isGroup) continue;

        const chatParticipants = await ctx.db
          .query("chatParticipants")
          .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
          .collect();

        if (chatParticipants.length === 2) {
          const participantUserIds = chatParticipants.map((p) => p.userId);
          if (
            participantUserIds.includes(allParticipantIds[0]) &&
            participantUserIds.includes(allParticipantIds[1])
          ) {
            // Found existing 1-on-1 chat
            return chat._id;
          }
        }
      }
    }

    // Create new chat
    const isGroup = allParticipantIds.length > 2;
    const chatId = await ctx.db.insert("chats", {
      isGroup,
      name: isGroup ? undefined : undefined, // Can be set later for group chats
    });

    // Add all participants
    await Promise.all(
      allParticipantIds.map((participantId) =>
        ctx.db.insert("chatParticipants", {
          chatId,
          userId: participantId,
        })
      )
    );

    return chatId;
  },
});

// Add a user to an existing chat
export const addUserToChat = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
  },
  handler: async (ctx, { chatId, userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify user is a participant of the chat
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to add users to this chat");
    }

    const chat = await ctx.db.get(chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }

    // Check if user is already a participant
    const existingParticipation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", userId).eq("chatId", chatId)
      )
      .unique();

    if (existingParticipation) {
      throw new ConvexError("User is already in this chat");
    }

    // If this is a 1-on-1 chat, convert it to a group chat
    if (!chat.isGroup) {
      await ctx.db.patch(chatId, { isGroup: true });
    }

    // Add the new participant
    await ctx.db.insert("chatParticipants", {
      chatId,
      userId,
    });

    return chatId;
  },
});

// Update chat name (for group chats)
export const updateChatName = mutation({
  args: {
    chatId: v.id("chats"),
    name: v.string(),
  },
  handler: async (ctx, { chatId, name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify user is a participant
    const participation = await ctx.db
      .query("chatParticipants")
      .withIndex("by_user_and_chat", (q) =>
        q.eq("userId", user._id).eq("chatId", chatId)
      )
      .unique();

    if (!participation) {
      throw new ConvexError("Not authorized to update this chat");
    }

    await ctx.db.patch(chatId, { name });
    return chatId;
  },
});
