import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Send, Reply, X } from "lucide-react";

interface ChatRoomProps {
  chatRoomId: Id<"chatRooms">;
  currentUserId: Id<"users">;
  maxHeight?: string;
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatRoom({ chatRoomId, currentUserId, maxHeight = "h-96" }: ChatRoomProps) {
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.chatRoomMessages.listByRoom, { chatRoomId }),
  );
  const { data: memberships } = useSuspenseQuery(
    convexQuery(api.chatRoomUsers.listByRoom, { chatRoomId }),
  );

  // Get participant user IDs and fetch user details
  const participantIds = useMemo(
    () => memberships.map((m) => m.userId),
    [memberships],
  );
  const { data: participants } = useSuspenseQuery(
    convexQuery(api.users.getMany, { userIds: participantIds }),
  );

  const sendMessage = useMutation(api.chatRoomMessages.send);

  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Doc<"chatRoomMessages"> | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const participantsMap = new Map(participants.map((p) => [p._id, p]));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content) return;

    const messageToSend = content;
    const replyTo = replyingTo;

    setNewMessage("");
    setReplyingTo(null);
    setSendError(null);
    setIsSending(true);

    try {
      await sendMessage({
        chatRoomId,
        content: messageToSend,
        parentMessageId: replyTo?._id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setSendError("Failed to send message. Please try again.");
      // Restore the message content so user can retry
      setNewMessage(messageToSend);
      setReplyingTo(replyTo);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const getParentMessage = (parentId: Id<"chatRoomMessages"> | undefined) => {
    if (!parentId) return null;
    return messages.find((m) => m._id === parentId);
  };

  return (
    <div className={`flex flex-col ${maxHeight}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {messages.length === 0 ? (
          <div className="text-center text-base-content/50 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const sender = participantsMap.get(message.senderId);
            const isCurrentUser = message.senderId === currentUserId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showSender = !prevMessage || prevMessage.senderId !== message.senderId;
            const parentMessage = getParentMessage(message.parentMessageId);

            return (
              <div
                key={message._id}
                className={`group flex gap-2 ${showSender ? "mt-2" : ""}`}
              >
                {/* Avatar column */}
                <div className="w-6 flex-shrink-0">
                  {showSender && sender?.imageUrl && (
                    <img
                      src={sender.imageUrl}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  {showSender && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">
                        {isCurrentUser ? "You" : sender?.name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {formatMessageTime(message._creationTime)}
                      </span>
                    </div>
                  )}

                  {/* Reply indicator */}
                  {parentMessage && (
                    <div className="text-xs text-base-content/50 border-l-2 border-base-content/20 pl-2 mb-1 truncate">
                      Replying to {participantsMap.get(parentMessage.senderId)?.name ?? "Unknown"}:{" "}
                      {parentMessage.content.slice(0, 50)}
                      {parentMessage.content.length > 50 ? "..." : ""}
                    </div>
                  )}

                  <p className="text-sm break-words">{message.content}</p>
                </div>

                {/* Reply button on hover */}
                <button
                  onClick={() => {
                    setReplyingTo(message);
                    inputRef.current?.focus();
                  }}
                  className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs"
                  title="Reply"
                >
                  <Reply className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-2 py-1 bg-base-200 text-sm">
          <Reply className="w-3 h-3" />
          <span className="truncate flex-1">
            Replying to {participantsMap.get(replyingTo.senderId)?.name ?? "Unknown"}:{" "}
            {replyingTo.content.slice(0, 50)}
          </span>
          <button onClick={() => setReplyingTo(null)} className="btn btn-ghost btn-xs">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error message */}
      {sendError && (
        <div className="px-2 py-1 bg-error/10 text-error text-sm">
          {sendError}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-base-300">
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="textarea textarea-bordered textarea-sm flex-1 min-h-[2.5rem] max-h-24 resize-none"
          rows={1}
          disabled={isSending}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!newMessage.trim() || isSending}
          className="btn btn-primary btn-sm btn-square"
          aria-label="Send message"
        >
          {isSending ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
