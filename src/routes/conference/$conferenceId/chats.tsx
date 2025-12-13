import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
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
  component: ChatsPage,
});

function ChatsPage() {
  const { conferenceId } = Route.useParams();
  const { data: rooms } = useSuspenseQuery(chatRoomsQuery);
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);

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
      </div>

      {/* Desktop: split view with empty state on right */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:h-[calc(100vh-12rem)]">
        {/* Left panel: chat list */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-y-auto h-full">
            <ChatRoomList
              rooms={rooms}
              users={usersMap}
              currentUserId={currentUser._id}
              conferenceId={conferenceId}
            />
          </CardContent>
        </Card>

        {/* Right panel: empty state */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardContent className="flex flex-col items-center justify-center text-muted-foreground gap-2 flex-1">
            <div>Select a conversation</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
