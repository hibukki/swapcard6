import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatRoom } from "../components/chat/ChatRoom";
import { ArrowLeft } from "lucide-react";
import { Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/public-chat/$chatRoomId")({
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
      ]);
    }
  },
  component: PublicChatRoomPage,
});

function PublicChatRoomPage() {
  const { chatRoomId } = Route.useParams();
  const navigate = useNavigate();
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);

  const roomQuery = useQuery(
    convexQuery(api.chatRooms.get, {
      chatRoomId: chatRoomId as Id<"chatRooms">,
    })
  );

  useEffect(() => {
    if (roomQuery.error) {
      console.error("Failed to load chat room:", roomQuery.error);
      void navigate({ to: "/public-chats", replace: true });
    }
  }, [roomQuery.error, navigate]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  if (roomQuery.isPending) {
    return <div>Loading chat...</div>;
  }

  if (roomQuery.error) {
    return <div>Redirecting...</div>;
  }

  const room = roomQuery.data?.room;
  const displayName = room?.name || "Chat Room";

  return (
    <div className="not-prose h-[calc(100vh-12rem)]">
      <Card className="h-full overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/public-chats">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <span className="font-medium truncate">{displayName}</span>
        </div>

        <div className="flex-1 min-h-0">
          <Suspense fallback={<div className="p-4">Loading messages...</div>}>
            <ChatRoom
              chatRoomId={chatRoomId as Id<"chatRooms">}
              currentUserId={currentUser._id}
              maxHeight="h-full"
              autoFocus
            />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
