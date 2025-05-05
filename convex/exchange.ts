import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Initialize user with 1000 clips on first sign-in (or return existing user)
export const getOrCreateUser = mutation({
  args: {},
  // Return the user id
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to getOrCreateUser");
    }

    // Find existing user by Clerk subject id
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create new user with starting balance
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? identity.email ?? "Unknown",
      balance: 1000,
    });
    return userId;
  },
});

export const sendClips = mutation({
  args: {
    toUserId: v.id("users"),
    amount: v.number(),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to sendClips");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const fromUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!fromUser) throw new Error("Sender record not found");

    if (fromUser.balance < args.amount) {
      throw new Error("Insufficient balance");
    }

    const toUser = await ctx.db.get(args.toUserId);
    if (!toUser) throw new Error("Recipient not found");

    // Update balances
    await ctx.db.patch(fromUser._id, {
      balance: fromUser.balance - args.amount,
    });
    await ctx.db.patch(args.toUserId, {
      balance: toUser.balance + args.amount,
    });

    // Record transaction
    await ctx.db.insert("transactions", {
      from: fromUser._id,
      to: args.toUserId,
      amount: args.amount,
      note: args.note,
    });

    return null;
  },
});

export const transactionsForCurrentUser = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      from: v.id("users"),
      to: v.id("users"),
      amount: v.number(),
      note: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const sent = ctx.db
      .query("transactions")
      .withIndex("by_from", (q) => q.eq("from", user._id));

    const received = ctx.db
      .query("transactions")
      .withIndex("by_to", (q) => q.eq("to", user._id));

    // Collect results (can optimize but fine)
    const items = [...(await sent.collect()), ...(await received.collect())];

    // Sort by creation time descending
    items.sort((a, b) => b._creationTime - a._creationTime);

    return items;
  },
});

export const currentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      name: v.string(),
      balance: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    return user;
  },
});

export const listRecipients = query({
  args: {},
  returns: v.record(v.id("users"), v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};

    const self = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const q = ctx.db.query("users");
    const users = await q.collect();

    const recipientsMap: Record<string, string> = {};

    // Add all other users to the map
    users
      .filter((u) => !self || u._id !== self._id)
      .forEach((u) => {
        recipientsMap[u._id] = u.name;
      });

    return recipientsMap;
  },
});
