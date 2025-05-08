import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const sendMessage = mutation({
  args: {
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId: Id<"users"> = await ctx.runMutation(
      api.users.getOrCreateUser,
      {},
    );

    return await ctx.db.insert("messages", {
      userId,
      body: args.body,
    });
  },
});

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();

    const userIds = [...new Set(messages.map((message) => message.userId))];

    const userMap = new Map();

    await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) {
          throw new Error(`User not found for ID ${userId}`);
        }

        userMap.set(userId.toString(), {
          _id: user._id,
          name: user.name,
          clerkId: user.clerkId,
        });
      }),
    );

    return messages.map((message) => ({
      ...message,
      user: userMap.get(message.userId.toString()),
    }));
  },
});
