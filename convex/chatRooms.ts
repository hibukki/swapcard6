import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { getCurrentUserOrCrash } from "./users";

async function getRoomParticipantIds(
  ctx: QueryCtx | MutationCtx,
  chatRoomId: Id<"chatRooms">,
): Promise<Id<"users">[]> {
  const participants = await ctx.db
    .query("chatRoomUsers")
    .withIndex("by_chatRoom", (q) => q.eq("chatRoomId", chatRoomId))
    .collect();
  return participants.map((p) => p.userId);
}

async function isUserInRoom(
  ctx: QueryCtx | MutationCtx,
  chatRoomId: Id<"chatRooms">,
  userId: Id<"users">,
): Promise<boolean> {
  const membership = await ctx.db
    .query("chatRoomUsers")
    .withIndex("by_chatRoom_and_user", (q) =>
      q.eq("chatRoomId", chatRoomId).eq("userId", userId),
    )
    .unique();
  return membership !== null;
}

async function findRoomByParticipants(
  ctx: QueryCtx | MutationCtx,
  userIds: Id<"users">[],
): Promise<Doc<"chatRooms"> | null> {
  if (userIds.length === 0) return null;

  const sortedUserIds = [...userIds].sort();

  // Get all rooms the first user is in
  const firstUserRooms = await ctx.db
    .query("chatRoomUsers")
    .withIndex("by_user", (q) => q.eq("userId", sortedUserIds[0]))
    .collect();

  // For each room, check if participants match exactly
  for (const membership of firstUserRooms) {
    const roomParticipantIds = await getRoomParticipantIds(
      ctx,
      membership.chatRoomId,
    );
    const sortedRoomParticipants = [...roomParticipantIds].sort();

    if (
      sortedRoomParticipants.length === sortedUserIds.length &&
      sortedRoomParticipants.every((id, i) => id === sortedUserIds[i])
    ) {
      return await ctx.db.get(membership.chatRoomId);
    }
  }

  return null;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    // Get all rooms the user is in
    const memberships = await ctx.db
      .query("chatRoomUsers")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    // Fetch room details and participants
    const roomsWithDetails = await Promise.all(
      memberships.map(async (m) => {
        const room = await ctx.db.get(m.chatRoomId);
        if (!room) return null;

        const participantIds = await getRoomParticipantIds(ctx, room._id);

        return {
          room,
          participantIds,
        };
      }),
    );

    // Filter out nulls and sort by lastMessageAt desc
    return roomsWithDetails
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.room.lastMessageAt ?? 0) - (a.room.lastMessageAt ?? 0));
  },
});

export const get = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    const room = await ctx.db.get(args.chatRoomId);
    if (!room) {
      throw new ConvexError("Chat room not found");
    }

    const isParticipant = await isUserInRoom(ctx, room._id, currentUser._id);
    if (!isParticipant) {
      throw new ConvexError("Not a participant of this chat room");
    }

    const participantIds = await getRoomParticipantIds(ctx, room._id);

    return { room, participantIds };
  },
});

export const getOrCreate = mutation({
  args: { participantIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrCrash(ctx);

    // Ensure current user is included in participants
    const allParticipantIds = args.participantIds.includes(currentUser._id)
      ? args.participantIds
      : [...args.participantIds, currentUser._id];

    if (allParticipantIds.length < 2) {
      throw new ConvexError("A chat room needs at least 2 participants");
    }

    // Check for existing room with exact participants
    const existingRoom = await findRoomByParticipants(ctx, allParticipantIds);
    if (existingRoom) {
      return existingRoom._id;
    }

    // Create new room
    const roomId = await ctx.db.insert("chatRooms", {});

    // Add all participants
    for (const userId of allParticipantIds) {
      await ctx.db.insert("chatRoomUsers", {
        chatRoomId: roomId,
        userId,
      });
    }

    return roomId;
  },
});
