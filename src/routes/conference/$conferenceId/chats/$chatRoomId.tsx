import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { ArrowLeft } from "lucide-react";
import { Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute(
  "/conference/$conferenceId/chats/$chatRoomId"
)({
  loader: async ({ context: { queryClient }, params }) => {
    const chatRoomId = params.chatRoomId as Id<"chatRooms">;
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(currentUserQuery),
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
  const { chatRoomId, conferenceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);

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
      void navigate({
        to: "/conference/$conferenceId/chats",
        params: { conferenceId },
        replace: true,
      });
    }
  }, [roomQuery.error, navigate, conferenceId]);

  if (!currentUser) {
    return <div className="p-4">Loading...</div>;
  }

  if (roomQuery.isPending) {
    return <div className="p-4">Loading chat...</div>;
  }

  if (roomQuery.error) {
    return <div className="p-4">Redirecting...</div>;
  }

  const otherParticipants = participants.filter(
    (p) => p._id !== currentUser._id
  );
  const displayName =
    otherParticipants.map((p) => p.name).join(", ") || "Chat";

  return (
    <>
      {/* Mobile: full screen chat with back button */}
      <div className="lg:hidden h-[calc(100vh-12rem)]">
        <Card className="h-full overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/conference/$conferenceId/chats" params={{ conferenceId }}>
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
        </Card>
      </div>

      {/* Desktop: just the chat content (sidebar is in layout) */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b">
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
    </>
  );
}
