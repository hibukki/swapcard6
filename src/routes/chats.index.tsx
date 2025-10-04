import { createFileRoute, Link } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCircle, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/chats/")({
  component: ChatsPage,
  loader: async ({ context: { queryClient } }) => {
    const chatsQuery = convexQuery(api.chats.getUserChats, {});
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(chatsQuery);
    }
  },
});

function ChatsPage() {
  const chatsQuery = convexQuery(api.chats.getUserChats, {});
  const { data: chats } = useSuspenseQuery(chatsQuery);

  return (
    <div className="not-prose max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chats</h1>
        <Link to="/chats/new" className="btn btn-primary">
          New Chat
        </Link>
      </div>

      {chats.length === 0 ? (
        <div className="card card-border bg-base-200">
          <div className="card-body text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No chats yet</p>
            <p className="text-sm opacity-70">
              Start a conversation with another attendee
            </p>
            <div className="card-actions justify-center mt-4">
              <Link to="/attendees" className="btn btn-primary">
                Browse Attendees
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const chatName = getChatName(chat);
            return (
              <Link
                key={chat._id}
                to="/chats/$chatId"
                params={{ chatId: chat._id }}
                className="card card-border bg-base-100 hover:bg-base-200 transition-colors"
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {chat.isGroup ? (
                          <Users className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <MessageCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold truncate">{chatName}</h3>
                      </div>
                      <p className="text-sm opacity-70 truncate">
                        {chat.participants.length} participant
                        {chat.participants.length !== 1 ? "s" : ""}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm opacity-60 truncate mt-1">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <div className="text-xs opacity-50 ml-2">
                        {formatTime(chat.lastMessage._creationTime)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getChatName(chat: {
  name?: string;
  isGroup: boolean;
  participants: (Doc<"users"> | null)[];
}) {
  if (chat.name) return chat.name;

  const names = chat.participants
    .filter((p): p is Doc<"users"> => p !== null)
    .map((p) => p.name)
    .join(", ");

  return names || "Unnamed Chat";
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (hours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}
