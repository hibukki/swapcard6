import { query } from "./_generated/server";

/**
 * Simple health check query to verify backend connectivity.
 * Returns immediately with a success status.
 * No authentication required - can be called before login.
 */
export const check = query({
  args: {},
  handler: async () => {
    return { status: "ok" };
  },
});
