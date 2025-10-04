import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendMeetingRequest = mutation({
  args: {
    recipientId: v.id("users"),
    proposedTime: v.optional(v.number()),
    proposedDuration: v.optional(v.number()),
    location: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const requester = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!requester) {
      throw new ConvexError("User not found");
    }

    // Check if a request already exists
    const existingRequest = await ctx.db
      .query("meetingRequests")
      .withIndex("by_requester", (q) =>
        q.eq("requesterId", requester._id).eq("status", "pending")
      )
      .collect();

    const hasPendingRequest = existingRequest.some(
      (r) => r.recipientId === args.recipientId
    );

    if (hasPendingRequest) {
      throw new ConvexError("You already have a pending request with this user");
    }

    const requestId = await ctx.db.insert("meetingRequests", {
      requesterId: requester._id,
      recipientId: args.recipientId,
      status: "pending",
      proposedTime: args.proposedTime,
      proposedDuration: args.proposedDuration ?? 30,
      location: args.location,
      message: args.message,
    });

    return requestId;
  },
});

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { sent: [], received: [] };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return { sent: [], received: [] };

    const sentRequests = await ctx.db
      .query("meetingRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .collect();

    const receivedRequests = await ctx.db
      .query("meetingRequests")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const enrichSent = await Promise.all(
      sentRequests.map(async (req) => ({
        ...req,
        recipient: await ctx.db.get(req.recipientId),
      }))
    );

    const enrichReceived = await Promise.all(
      receivedRequests.map(async (req) => ({
        ...req,
        requester: await ctx.db.get(req.requesterId),
      }))
    );

    return { sent: enrichSent, received: enrichReceived };
  },
});

export const respondToRequest = mutation({
  args: {
    requestId: v.id("meetingRequests"),
    accept: v.boolean(),
    scheduledTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    location: v.optional(v.string()),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    if (request.recipientId !== user._id) {
      throw new ConvexError("Not authorized");
    }

    if (request.status !== "pending") {
      throw new ConvexError("Request already responded to");
    }

    if (args.accept) {
      const scheduledTime = args.scheduledTime ?? request.proposedTime ?? Date.now();
      const duration = args.duration ?? request.proposedDuration ?? 30;

      await ctx.db.insert("meetings", {
        requestId: args.requestId,
        attendee1Id: request.requesterId,
        attendee2Id: request.recipientId,
        scheduledTime,
        duration,
        location: args.location ?? request.location,
      });

      await ctx.db.patch(args.requestId, { status: "accepted" });
    } else {
      await ctx.db.patch(args.requestId, { status: "rejected" });
    }
  },
});

export const getMyMeetings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const meetings1 = await ctx.db
      .query("meetings")
      .withIndex("by_attendee1", (q) => q.eq("attendee1Id", user._id))
      .collect();

    const meetings2 = await ctx.db
      .query("meetings")
      .withIndex("by_attendee2", (q) => q.eq("attendee2Id", user._id))
      .collect();

    const allMeetings = [...meetings1, ...meetings2];

    const enriched = await Promise.all(
      allMeetings.map(async (meeting) => {
        const otherUserId =
          meeting.attendee1Id === user._id
            ? meeting.attendee2Id
            : meeting.attendee1Id;
        const otherUser = await ctx.db.get(otherUserId);
        return { ...meeting, otherUser };
      })
    );

    return enriched.sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});
