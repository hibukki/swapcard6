import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatRoomList } from "../components/chat/ChatRoomList";
import { useMemo } from "react";

const chatRoomsQuery = convexQuery(api.chatRooms.list, {});
const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/chats")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(chatRoomsQuery),
        queryClient.ensureQueryData(currentUserQuery),
      ]);
    }
  },
  component: ChatsPage,
});

function ChatsPage() {
  const { data: rooms } = useSuspenseQuery(chatRoomsQuery);
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);

  // Get all unique participant IDs
  const allParticipantIds = useMemo(() => {
    const ids = new Set<Id<"users">>();
    for (const { participantIds } of rooms) {
      for (const id of participantIds) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [rooms]);

  // Fetch all participants
  const { data: participants } = useSuspenseQuery(
    convexQuery(api.users.getMany, { userIds: allParticipantIds }),
  );

  const usersMap = useMemo(() => {
    const map = new Map<Id<"users">, (typeof participants)[number]>();
    for (const user of participants) {
      map.set(user._id, user);
    }
    return map;
  }, [participants]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="not-prose">
      {/* Mobile: full-width list */}
      <div className="lg:hidden">
        <div className="card bg-base-200">
          <div className="card-body p-0">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
            />
          </div>
        </div>
      </div>

      {/* Desktop: split view with empty state on right */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:h-[calc(100vh-12rem)]">
        {/* Left panel: chat list */}
        <div className="card bg-base-200 overflow-hidden">
          <div className="card-body p-0 overflow-y-auto">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
            />
          </div>
        </div>

        {/* Right panel: empty state */}
        <div className="lg:col-span-2 card bg-base-200 flex flex-col">
          <div className="card-body flex flex-col items-center justify-center text-base-content/50 gap-2">
            <div>Select a conversation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
