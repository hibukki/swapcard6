import { internalMutation, internalQuery } from "./_generated/server";
import type { LlmRateLimitWindow } from "./schema";

const LIMITS: Record<LlmRateLimitWindow, { duration: number; max: number }> = {
  minute: { duration: 60 * 1000, max: 5 },
  hour: { duration: 60 * 60 * 1000, max: 60 },
  day: { duration: 24 * 60 * 60 * 1000, max: 300 },
};

function getWindowStart(window: LlmRateLimitWindow, now: number): number {
  const { duration } = LIMITS[window];
  return Math.floor(now / duration) * duration;
}

export const checkRateLimit = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ allowed: boolean; reason?: string }> => {
    const now = Date.now();

    for (const window of ["minute", "hour", "day"] as const) {
      const { max } = LIMITS[window];
      const windowStart = getWindowStart(window, now);

      const record = await ctx.db
        .query("llmRateLimits")
        .withIndex("by_window_and_start", (q) =>
          q.eq("window", window).eq("windowStart", windowStart)
        )
        .unique();

      if (record && record.count >= max) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${max} requests per ${window}`,
        };
      }
    }

    return { allowed: true };
  },
});

export const incrementUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    for (const window of ["minute", "hour", "day"] as const) {
      const windowStart = getWindowStart(window, now);

      const record = await ctx.db
        .query("llmRateLimits")
        .withIndex("by_window_and_start", (q) =>
          q.eq("window", window).eq("windowStart", windowStart)
        )
        .unique();

      if (record) {
        await ctx.db.patch(record._id, { count: record.count + 1 });
      } else {
        await ctx.db.insert("llmRateLimits", {
          window,
          windowStart,
          count: 1,
        });
      }
    }
  },
});

// Cleanup old rate limit records (can be called periodically)
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oldestRelevant = now - LIMITS.day.duration * 2; // Keep 2 days of history

    const oldRecords = await ctx.db
      .query("llmRateLimits")
      .filter((q) => q.lt(q.field("windowStart"), oldestRelevant))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});
