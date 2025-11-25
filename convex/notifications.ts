import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { getCurrentUserOrCrash, getCurrentUserOrNull } from "./users";
import { Id } from "./_generated/dataModel";
import { notificationTypeValidator, NotificationType } from "./schema";

export const list = query({
  args: { unreadOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    if (args.unreadOnly) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_user_and_read", (q) =>
          q.eq("userId", user._id).eq("isRead", false)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const countUnread = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new ConvexError("Not your notification");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrCrash(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});

export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCrash(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new ConvexError("Not your notification");
    }

    await ctx.db.delete(args.notificationId);
  },
});

export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: NotificationType;
    title: string;
    body?: string;
    relatedMeetingId?: Id<"meetings">;
    relatedConferenceId?: Id<"conferences">;
    relatedUserId?: Id<"users">;
  },
) {
  return await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    body: args.body,
    relatedMeetingId: args.relatedMeetingId,
    relatedConferenceId: args.relatedConferenceId,
    relatedUserId: args.relatedUserId,
    isRead: false,
  });
}

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.optional(v.string()),
    relatedMeetingId: v.optional(v.id("meetings")),
    relatedConferenceId: v.optional(v.id("conferences")),
    relatedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
    });
  },
});
