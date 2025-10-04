import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMutation, useQuery as useConvexQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, UserPlus, Edit3 } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { z } from "zod";

export const Route = createFileRoute("/chats/$chatId/settings")({
  component: ChatSettingsPage,
  loader: async ({ context: { queryClient }, params: { chatId } }) => {
    const chatQuery = convexQuery(api.chats.getChat, {
      chatId: chatId as Id<"chats">,
    });
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(chatQuery);
    }
  },
});

function ChatSettingsPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const chatQuery = convexQuery(api.chats.getChat, {
    chatId: chatId as Id<"chats">,
  });
  const { data: chat } = useSuspenseQuery(chatQuery);

  const updateChatName = useMutation(api.chats.updateChatName);
  const addUserToChat = useMutation(api.chats.addUserToChat);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const allUsers = useConvexQuery(api.users.list);
  const availableUsers =
    allUsers?.filter(
      (user) => !chat.participants.some((p) => p._id === user._id)
    ) || [];

  const nameSchema = z.object({
    name: z.string().min(1, "Name cannot be empty"),
  });

  const nameForm = useForm({
    defaultValues: {
      name: chat.name || "",
    },
    validators: {
      onChange: nameSchema,
    },
    onSubmit: async ({ value }) => {
      await updateChatName({
        chatId: chatId as Id<"chats">,
        name: value.name,
      });
      setIsEditingName(false);
    },
  });

  const handleAddUser = async (userId: Id<"users">) => {
    await addUserToChat({
      chatId: chatId as Id<"chats">,
      userId,
    });
    setIsAddingUser(false);
  };

  const chatName =
    chat.name ||
    chat.participants
      .map((p) => p.name)
      .join(", ") ||
    "Unnamed Chat";

  return (
    <div className="not-prose max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/chats/$chatId"
          params={{ chatId }}
          className="btn btn-ghost btn-sm btn-square"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Chat Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Chat Name */}
        <div className="card card-border bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Chat Name</h2>
              {chat.isGroup && !isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {isEditingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void nameForm.handleSubmit();
                }}
                className="space-y-4"
              >
                <nameForm.Field name="name">
                  {(field) => (
                    <div>
                      <input
                        type="text"
                        placeholder="Enter chat name"
                        className="input input-bordered w-full"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {!field.state.meta.isValid && (
                        <p className="text-error text-sm mt-1">
                          {field.state.meta.errors.map((e) => e.message).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </nameForm.Field>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      !nameForm.state.canSubmit || nameForm.state.isSubmitting
                    }
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      nameForm.reset();
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-lg">{chatName}</p>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="card card-border bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">
                Participants ({chat.participants.length})
              </h2>
              {!isAddingUser && availableUsers.length > 0 && (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              )}
            </div>

            {isAddingUser && (
              <div className="mb-4 space-y-2">
                <p className="text-sm opacity-70 mb-2">
                  Select a user to add to this chat:
                </p>
                {availableUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => void handleAddUser(user._id)}
                    className="btn btn-ghost w-full justify-start gap-3"
                  >
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-10 h-10">
                        <span className="text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{user.name}</div>
                      {user.company && (
                        <div className="text-sm opacity-70">{user.company}</div>
                      )}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setIsAddingUser(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="space-y-2">
              {chat.participants.map((participant) => (
                <div
                  key={participant._id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-base-200"
                >
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-10 h-10">
                      <span className="text-sm">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{participant.name}</div>
                    {participant.company && (
                      <div className="text-sm opacity-70">
                        {participant.company}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
