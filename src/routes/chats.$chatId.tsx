import { createFileRoute, Link } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Send, Smile, Reply, Users } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { z } from "zod";

export const Route = createFileRoute("/chats/$chatId")({
  component: ChatPage,
  loader: async ({ context: { queryClient }, params: { chatId } }) => {
    const chatQuery = convexQuery(api.chats.getChat, {
      chatId: chatId as Id<"chats">,
    });
    const messagesQuery = convexQuery(api.chats.getChatMessages, {
      chatId: chatId as Id<"chats">,
    });
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(chatQuery),
        queryClient.ensureQueryData(messagesQuery),
      ]);
    }
  },
});

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🤔"];

function ChatPage() {
  const { chatId } = Route.useParams();
  const chatQuery = convexQuery(api.chats.getChat, {
    chatId: chatId as Id<"chats">,
  });
  const messagesQuery = convexQuery(api.chats.getChatMessages, {
    chatId: chatId as Id<"chats">,
  });
  const { data: chat } = useSuspenseQuery(chatQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);

  const sendMessage = useMutation(api.chats.sendMessage);
  const addReaction = useMutation(api.chats.addReaction);

  const [replyingTo, setReplyingTo] = useState<Id<"messages"> | null>(null);

  const messageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty"),
  });

  const form = useForm({
    defaultValues: {
      content: "",
    },
    validators: {
      onChange: messageSchema,
    },
    onSubmit: async ({ value }) => {
      await sendMessage({
        chatId: chatId as Id<"chats">,
        content: value.content,
        parentMessageId: replyingTo ?? undefined,
      });
      form.reset();
      setReplyingTo(null);
    },
  });

  const chatName =
    chat.name ||
    chat.participants
      .map((p) => p.name)
      .join(", ") ||
    "Unnamed Chat";

  const replyingToMessage = replyingTo
    ? messages.find((m) => m._id === replyingTo)
    : null;

  return (
    <div className="not-prose flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-base-300">
        <Link to="/chats" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {chat.isGroup && <Users className="w-6 h-6" />}
            {chatName}
          </h1>
          <p className="text-sm opacity-70">
            {chat.participants.length} participant
            {chat.participants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          to="/chats/$chatId/settings"
          params={{ chatId }}
          className="btn btn-ghost btn-sm"
        >
          Settings
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 opacity-70">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageComponent
              key={message._id}
              message={message}
              onReact={(emoji) =>
                void addReaction({ messageId: message._id, emoji })
              }
              onReply={() => setReplyingTo(message._id)}
            />
          ))
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && replyingToMessage && (
        <div className="bg-base-200 p-2 rounded-lg mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="w-4 h-4" />
            <span className="opacity-70">Replying to:</span>
            <span className="truncate max-w-xs">
              {replyingToMessage.content}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="btn btn-ghost btn-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="flex gap-2"
      >
        <form.Field name="content">
          {(field) => (
            <div className="flex-1">
              <input
                type="text"
                placeholder="Type a message..."
                className="input input-bordered w-full"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!form.state.canSubmit || form.state.isSubmitting}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

interface MessageComponentProps {
  message: {
    _id: Id<"messages">;
    _creationTime: number;
    content: string;
    author: { name: string; imageUrl?: string } | null;
    reactions: { emoji: string; userId: Id<"users"> }[];
    replies?: {
      _id: Id<"messages">;
      _creationTime: number;
      content: string;
      author: { name: string; imageUrl?: string } | null;
      reactions: { emoji: string; userId: Id<"users"> }[];
    }[];
  };
  onReact: (emoji: string) => void;
  onReply: () => void;
}

function MessageComponent({
  message,
  onReact,
  onReply,
}: MessageComponentProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = message.reactions.reduce(
    (acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-10 h-10">
            <span className="text-sm">
              {message.author?.name.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold">{message.author?.name}</span>
            <span className="text-xs opacity-50">
              {formatMessageTime(message._creationTime)}
            </span>
          </div>
          <div className="bg-base-200 rounded-lg p-3 inline-block max-w-xl">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex gap-1 mt-2">
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="btn btn-xs gap-1"
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="btn btn-ghost btn-xs gap-1"
              >
                <Smile className="w-4 h-4" />
                React
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 bg-base-200 rounded-lg p-2 shadow-lg flex gap-1 z-10">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="btn btn-ghost btn-sm text-lg hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onReply} className="btn btn-ghost btn-xs gap-1">
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>

          {/* Replies */}
          {message.replies && message.replies.length > 0 && (
            <div className="ml-6 mt-3 space-y-2 border-l-2 border-base-300 pl-4">
              {message.replies.map((reply) => (
                <ReplyComponent key={reply._id} reply={reply} onReact={onReact} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyComponentProps {
  reply: {
    _id: Id<"messages">;
    _creationTime: number;
    content: string;
    author: { name: string; imageUrl?: string } | null;
    reactions: { emoji: string; userId: Id<"users"> }[];
  };
  onReact: (emoji: string) => void;
}

function ReplyComponent({ reply, onReact }: ReplyComponentProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const addReaction = useMutation(api.chats.addReaction);

  // Group reactions by emoji
  const groupedReactions = reply.reactions.reduce(
    (acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex gap-2">
      <div className="avatar placeholder">
        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8">
          <span className="text-xs">
            {reply.author?.name.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm">{reply.author?.name}</span>
          <span className="text-xs opacity-50">
            {formatMessageTime(reply._creationTime)}
          </span>
        </div>
        <div className="bg-base-300 rounded-lg p-2 inline-block max-w-lg">
          <p className="text-sm whitespace-pre-wrap break-words">
            {reply.content}
          </p>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => void addReaction({ messageId: reply._id, emoji })}
                className="btn btn-xs gap-1"
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="relative mt-1">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-ghost btn-xs gap-1"
          >
            <Smile className="w-3 h-3" />
            React
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 bg-base-200 rounded-lg p-2 shadow-lg flex gap-1 z-10">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    void addReaction({ messageId: reply._id, emoji });
                    setShowEmojiPicker(false);
                  }}
                  className="btn btn-ghost btn-sm text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes === 0 ? "Just now" : `${minutes}m ago`;
  } else if (hours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (hours < 48) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
