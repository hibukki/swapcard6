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
    canHelpWith: v.optional(v.string()),
    needsHelpWith: v.optional(v.string()),
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

export const getOrCreateCalendarToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrCrash(ctx);

    if (user.calendarToken) {
      return user.calendarToken;
    }

    const token = crypto.randomUUID();
    await ctx.db.patch(user._id, { calendarToken: token });
    return token;
  },
});

export const regenerateCalendarToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrCrash(ctx);
    const token = crypto.randomUUID();
    await ctx.db.patch(user._id, { calendarToken: token });
    return token;
  },
});

export async function getUserByCalendarToken(ctx: QueryCtx, token: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_calendarToken", (q) => q.eq("calendarToken", token))
    .unique();
}

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getMany = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(args.userIds.map((id) => ctx.db.get(id)));
    return users.filter((u) => u !== null);
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

// Find users who might be good connections based on text matching
// Matches: current user's needsHelpWith vs others' canHelpWith, and vice versa
// Also matches interests
export const findRecommendedUsers = query({
  args: {
    needsHelpWith: v.optional(v.string()),
    canHelpWith: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const allUsers = await ctx.db.query("users").collect();
    const otherUsers = allUsers.filter((u) => u._id !== currentUser._id);

    // Build search terms from the input (what the user is currently typing)
    const searchTerms: string[] = [];
    if (args.needsHelpWith) {
      searchTerms.push(...args.needsHelpWith.toLowerCase().split(/\s+/));
    }
    if (args.canHelpWith) {
      searchTerms.push(...args.canHelpWith.toLowerCase().split(/\s+/));
    }
    if (args.interests) {
      searchTerms.push(...args.interests.map(i => i.toLowerCase()));
    }

    // Filter out common words
    const stopWords = new Set(["and", "or", "the", "a", "an", "in", "on", "at", "to", "for", "with", "i", "my"]);
    const meaningfulTerms = searchTerms.filter(t => t.length > 2 && !stopWords.has(t));

    if (meaningfulTerms.length === 0) {
      // No search terms - return users with filled profiles
      return otherUsers
        .filter(u => u.canHelpWith || u.needsHelpWith || (u.interests && u.interests.length > 0))
        .slice(0, args.limit ?? 5);
    }

    // Score each user based on matches
    const scoredUsers = otherUsers.map(user => {
      let score = 0;
      const userText = [
        user.canHelpWith ?? "",
        user.needsHelpWith ?? "",
        user.bio ?? "",
        user.role ?? "",
        ...(user.interests ?? []),
      ].join(" ").toLowerCase();

      for (const term of meaningfulTerms) {
        if (userText.includes(term)) {
          score += 1;
        }
      }

      // Bonus: if user's canHelpWith matches our needsHelpWith (or vice versa)
      if (args.needsHelpWith && user.canHelpWith) {
        const needsTerms = args.needsHelpWith.toLowerCase().split(/\s+/);
        const canTerms = user.canHelpWith.toLowerCase();
        for (const term of needsTerms) {
          if (term.length > 2 && !stopWords.has(term) && canTerms.includes(term)) {
            score += 2; // Bonus for direct match
          }
        }
      }

      if (args.canHelpWith && user.needsHelpWith) {
        const canTerms = args.canHelpWith.toLowerCase().split(/\s+/);
        const needsTerms = user.needsHelpWith.toLowerCase();
        for (const term of canTerms) {
          if (term.length > 2 && !stopWords.has(term) && needsTerms.includes(term)) {
            score += 2; // Bonus for direct match
          }
        }
      }

      return { user, score };
    });

    // Sort by score and return top matches
    return scoredUsers
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit ?? 5)
      .map(({ user }) => user);
  },
});
