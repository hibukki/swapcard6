import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

const chatRoomsQuery = convexQuery(api.chatRooms.list, {});
const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/conference/$conferenceId/chats")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(chatRoomsQuery),
        queryClient.ensureQueryData(currentUserQuery),
      ]);
    }
  },
  component: ChatsLayout,
});

interface ChatRoomWithDetails {
  room: Doc<"chatRooms">;
  participantIds: Id<"users">[];
}

// Export context for child routes
export interface ChatsContext {
  rooms: ChatRoomWithDetails[];
  usersMap: Map<Id<"users">, Doc<"users">>;
  currentUser: Doc<"users">;
}

function ChatsLayout() {
  const { conferenceId } = Route.useParams();
  const matchRoute = useMatchRoute();
  const { data: rooms } = useSuspenseQuery(chatRoomsQuery);
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);

  // Check if we're viewing a specific chat
  const chatMatch = matchRoute({
    to: "/conference/$conferenceId/chats/$chatRoomId",
    fuzzy: false,
  }) as { chatRoomId?: string } | false;
  const selectedChatRoomId = chatMatch ? chatMatch.chatRoomId as Id<"chatRooms"> : undefined;

  const allParticipantIds = useMemo(() => {
    const ids = new Set<Id<"users">>();
    for (const { participantIds } of rooms) {
      for (const id of participantIds) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [rooms]);

  const { data: participants } = useSuspenseQuery(
    convexQuery(api.users.getMany, { userIds: allParticipantIds })
  );

  const usersMap = useMemo(() => {
    const map = new Map<Id<"users">, Doc<"users">>();
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
      {/* Header with New Chat button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chats</h1>
        <NewChatDialog conferenceId={conferenceId} />
      </div>

      {/* Mobile: show list or chat based on route */}
      <div className="lg:hidden">
        {selectedChatRoomId ? (
          // Show chat content on mobile when a chat is selected
          <Outlet />
        ) : (
          // Show chat list on mobile when no chat selected
          <Card>
            <CardContent className="p-0">
              <ChatRoomList
                rooms={rooms}
                users={usersMap}
                currentUserId={currentUser._id}
                conferenceId={conferenceId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: split view */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:h-[calc(100vh-12rem)]">
        {/* Left panel: chat list */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-y-auto h-full">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
              selectedRoomId={selectedChatRoomId}
              conferenceId={conferenceId}
            />
          </CardContent>
        </Card>

        {/* Right panel: chat content or empty state */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
