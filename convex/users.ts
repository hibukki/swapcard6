import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError(
      "Bug: User is authenticated with convex but is missing a record in the DB",
    );
  }

  return user;
}

export async function getCurrentUserOrCrash(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrNull(ctx);

  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  return user;
}

export async function getUserById(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db.get(userId);
}

export async function getUserByIdOrCrash(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("User not found");
  }
  return user;
}

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      const clerkName = identity.name ?? "Anonymous";
      const clerkEmail = identity.email ?? "";
      const clerkImageUrl = identity.pictureUrl;

      const updates: Partial<typeof existingUser> = {};
      if (existingUser.name !== clerkName) updates.name = clerkName;
      if (existingUser.email !== clerkEmail) updates.email = clerkEmail;
      if (clerkImageUrl && existingUser.imageUrl !== clerkImageUrl)
        updates.imageUrl = clerkImageUrl;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates);
        return await ctx.db.get(existingUser._id);
      }
      return existingUser;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
    });

    return await ctx.db.get(userId);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
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

    await ctx.db.patch(user._id, args);
    return await ctx.db.get(user._id);
  },
});

// Note: This fetches all users and filters in the client. Acceptable for small user counts.
// For large scale, consider pagination with .paginate() or a different approach.
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u._id !== currentUser._id);
  },
});
