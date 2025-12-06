import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatRoom } from "./ChatRoom";
import { useEffect, useState, Suspense, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ChatEmbedProps {
  otherUserId: Id<"users">;
  autoFocus?: boolean;
}

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export function ChatEmbed({ otherUserId, autoFocus = false }: ChatEmbedProps) {
  const { data: currentUser } = useSuspenseQuery(currentUserQuery);
  const getOrCreateRoom = useMutation(api.chatRooms.getOrCreate);
  const [chatRoomId, setChatRoomId] = useState<Id<"chatRooms"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initRoom = useCallback(async () => {
    if (!currentUser) return;

    try {
      const roomId = await getOrCreateRoom({
        participantIds: [otherUserId],
      });
      setChatRoomId(roomId);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, otherUserId, getOrCreateRoom]);

  useEffect(() => {
    void initRoom();
  }, [initRoom]);

  if (!currentUser) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            <span>Loading chat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chatRoomId) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-3 border-b">
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Chat</span>
        </div>
        <Suspense fallback={<div className="p-4">Loading messages...</div>}>
          <ChatRoom
            chatRoomId={chatRoomId}
            currentUserId={currentUser._id}
            maxHeight="h-80"
            autoFocus={autoFocus}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
