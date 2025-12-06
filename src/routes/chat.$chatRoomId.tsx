import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatRoom } from "../components/chat/ChatRoom";
import { ChatRoomList } from "../components/chat/ChatRoomList";
import { ArrowLeft } from "lucide-react";
import { Suspense, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          convexQuery(api.chatRooms.get, { chatRoomId })
        ),
        queryClient.ensureQueryData(
          convexQuery(api.chatRoomMessages.listByRoom, { chatRoomId })
        ),
        queryClient.ensureQueryData(
          convexQuery(api.chatRoomUsers.listByRoom, { chatRoomId })
        ),
      ]);
    }
  },
  component: ChatRoomPage,
});

function ChatRoomPage() {
  const { chatRoomId } = Route.useParams();
  const navigate = useNavigate();
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);
  const { data: rooms } = useSuspenseQuery(chatRoomsQuery);

  const roomQuery = useQuery(
    convexQuery(api.chatRooms.get, {
      chatRoomId: chatRoomId as Id<"chatRooms">,
    })
  );

  const { data: participants } = useSuspenseQuery(
    convexQuery(api.chatRoomUsers.listByRoom, {
      chatRoomId: chatRoomId as Id<"chatRooms">,
    })
  );

  useEffect(() => {
    if (roomQuery.error) {
      console.error("Failed to load chat room:", roomQuery.error);
      void navigate({ to: "/chats", replace: true });
    }
  }, [roomQuery.error, navigate]);

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
    convexQuery(api.users.getMany, { userIds: allParticipantIds })
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

  if (roomQuery.isPending) {
    return <div>Loading chat...</div>;
  }

  if (roomQuery.error) {
    return <div>Redirecting...</div>;
  }

  const otherParticipants = participants.filter(
    (p) => p._id !== currentUser._id
  );
  const displayName =
    otherParticipants.map((p) => p.name).join(", ") || "Chat";

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        {/* Back button - mobile only */}
        <Button variant="ghost" size="icon-sm" asChild className="lg:hidden">
          <Link to="/chats">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
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
        <Card className="h-full overflow-hidden">{chatContent}</Card>
      </div>

      {/* Desktop: split view with chat list */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:h-[calc(100vh-12rem)]">
        {/* Left panel: chat list */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-y-auto h-full">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
              selectedRoomId={chatRoomId as Id<"chatRooms">}
            />
          </CardContent>
        </Card>

        {/* Right panel: selected chat */}
        <Card className="lg:col-span-2 overflow-hidden">{chatContent}</Card>
      </div>
    </div>
  );
}
