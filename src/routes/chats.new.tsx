import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/chats/new")({
  component: NewChatPage,
  loader: async ({ context: { queryClient } }) => {
    const usersQuery = convexQuery(api.users.list, {});
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(usersQuery);
    }
  },
});

function NewChatPage() {
  const navigate = useNavigate();
  const usersQuery = convexQuery(api.users.list, {});
  const { data: users } = useSuspenseQuery(usersQuery);

  const findOrCreateChat = useMutation(api.chats.findOrCreateChat);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<Id<"users">>>(
    new Set()
  );

  const toggleUser = (userId: Id<"users">) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleCreateChat = async () => {
    if (selectedUserIds.size === 0) return;

    const chatId = await findOrCreateChat({
      participantIds: Array.from(selectedUserIds),
    });

    void navigate({
      to: "/chats/$chatId",
      params: { chatId },
    });
  };

  return (
    <div className="not-prose max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/chats" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">New Chat</h1>
      </div>

      <div className="card card-border bg-base-100">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <p className="opacity-70">
              Select attendees to start a conversation (
              {selectedUserIds.size} selected)
            </p>
            <button
              onClick={() => void handleCreateChat()}
              className="btn btn-primary"
              disabled={selectedUserIds.size === 0}
            >
              <MessageCircle className="w-5 h-5" />
              Start Chat
            </button>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className={`btn btn-ghost w-full justify-start gap-3 ${
                  selectedUserIds.has(user._id) ? "btn-active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(user._id)}
                  onChange={() => {}}
                  className="checkbox checkbox-primary"
                />
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-10 h-10">
                    <span className="text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">{user.name}</div>
                  {user.company && (
                    <div className="text-sm opacity-70">{user.company}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
