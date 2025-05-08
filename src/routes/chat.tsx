import { useAuth } from "@clerk/clerk-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

// Message validation schema
const messageSchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Message too long (max 500 characters)"),
});

function ChatPage() {
  return (
    <Authenticated>
      <div className="flex flex-col gap-4 w-full">
        <h1 className="text-2xl font-bold">Chat Room</h1>
        <p className="text-sm text-base-content/70">
          Chat with other users in real-time
        </p>

        <div className="flex flex-col h-[calc(100vh-250px)] gap-4">
          <MessagesDisplay />
          <MessageInput />
        </div>
      </div>
    </Authenticated>
  );
}

function MessagesDisplay() {
  const messages = useQuery(api.messages.listMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userId } = useAuth();

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      void messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-base-200 rounded-lg p-4">
      <div className="flex flex-col gap-3">
        {messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/70 py-8">
            <div className="text-center">
              <p className="text-lg">No messages yet</p>
              <p>Be the first to say hello!</p>
            </div>
          </div>
        ) : (
          messages?.map((message) => {
            const isCurrentUser = message.user.clerkId === userId;
            const chatAlignment = isCurrentUser ? "chat-end" : "chat-start";

            return (
              <div key={message._id} className={`chat ${chatAlignment}`}>
                <div className="chat-header text-xs opacity-70">
                  {message.user.name}
                  <time className="ml-1">
                    {new Date(message._creationTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <div className="chat-bubble">{message.body}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function MessageInput() {
  const sendMessage = useMutation(api.messages.sendMessage);

  const form = useForm({
    defaultValues: {
      body: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await sendMessage({ body: value.body });
        void form.reset();
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    validators: {
      onChange: messageSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex gap-2"
    >
      <form.Field
        name="body"
        validators={{
          onChange: ({ value }) =>
            !value
              ? "Message cannot be empty"
              : value.length > 500
                ? "Message too long (max 500 characters)"
                : undefined,
        }}
      >
        {(field) => (
          <div className="flex-1">
            <div className="join w-full">
              <input
                className="input input-bordered join-item flex-1 w-full"
                placeholder="Type your message here..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <button
                type="submit"
                className="btn join-item"
                disabled={!form.state.canSubmit}
              >
                {form.state.isSubmitting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "Send"
                )}
              </button>
            </div>
            {field.state.meta.errors.length > 0 && (
              <div className="text-error text-xs mt-1">
                {field.state.meta.errors
                  .map((error) =>
                    typeof error === "string" ? error : JSON.stringify(error),
                  )
                  .join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>
    </form>
  );
}
