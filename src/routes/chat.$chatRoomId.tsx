import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatRoom } from "../components/chat/ChatRoom";
import { ChatRoomList } from "../components/chat/ChatRoomList";
import { ArrowLeft } from "lucide-react";
import { Suspense, useMemo } from "react";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});
const chatRoomsQuery = convexQuery(api.chatRooms.list, {});

export const Route = createFileRoute("/chat/$chatRoomId")({
  loader: async ({ context: { queryClient }, params }) => {
    const chatRoomId = params.chatRoomId as Id<"chatRooms">;
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(currentUserQuery),
        queryClient.ensureQueryData(chatRoomsQuery),
        queryClient.ensureQueryData(
          convexQuery(api.chatRooms.get, { chatRoomId }),
        ),
        queryClient.ensureQueryData(
          convexQuery(api.chatRoomMessages.listByRoom, { chatRoomId }),
        ),
        queryClient.ensureQueryData(
          convexQuery(api.chatRoomUsers.listByRoom, { chatRoomId }),
        ),
      ]);
    }
  },
  component: ChatRoomPage,
});

function ChatRoomPage() {
  const { chatRoomId } = Route.useParams();
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);
  const { data: rooms } = useSuspenseQuery(chatRoomsQuery);

  // Fetching room data validates that user is a participant (throws if not)
  useSuspenseQuery(
    convexQuery(api.chatRooms.get, { chatRoomId: chatRoomId as Id<"chatRooms"> }),
  );
  const { data: participants } = useSuspenseQuery(
    convexQuery(api.chatRoomUsers.listByRoom, { chatRoomId: chatRoomId as Id<"chatRooms"> }),
  );

  // Get all unique participant IDs for the chat list
  const allParticipantIds = useMemo(() => {
    const ids = new Set<Id<"users">>();
    for (const { participantIds } of rooms) {
      for (const id of participantIds) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [rooms]);

  const { data: allParticipants } = useSuspenseQuery(
    convexQuery(api.users.getMany, { userIds: allParticipantIds }),
  );

  const usersMap = useMemo(() => {
    const map = new Map<Id<"users">, (typeof allParticipants)[number]>();
    for (const user of allParticipants) {
      map.set(user._id, user);
    }
    return map;
  }, [allParticipants]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  // Get other participants for the header
  const otherParticipants = participants.filter((p) => p._id !== currentUser._id);
  const displayName = otherParticipants.map((p) => p.name).join(", ") || "Chat";

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-base-300">
        {/* Back button - mobile only */}
        <Link to="/chats" className="btn btn-ghost btn-sm btn-square lg:hidden">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-medium truncate">{displayName}</span>
      </div>

      {/* Chat content */}
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="p-4">Loading messages...</div>}>
          <ChatRoom
            chatRoomId={chatRoomId as Id<"chatRooms">}
            currentUserId={currentUser._id}
            maxHeight="h-full"
          />
        </Suspense>
      </div>
    </div>
  );

  return (
    <div className="not-prose">
      {/* Mobile: just the chat */}
      <div className="lg:hidden h-[calc(100vh-12rem)]">
        <div className="card bg-base-200 h-full overflow-hidden">
          {chatContent}
        </div>
      </div>

      {/* Desktop: split view with chat list */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:h-[calc(100vh-12rem)]">
        {/* Left panel: chat list */}
        <div className="card bg-base-200 overflow-hidden">
          <div className="card-body p-0 overflow-y-auto">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
              selectedRoomId={chatRoomId as Id<"chatRooms">}
            />
          </div>
        </div>

        {/* Right panel: selected chat */}
        <div className="lg:col-span-2 card bg-base-200 overflow-hidden">
          {chatContent}
        </div>
      </div>
    </div>
  );
}
