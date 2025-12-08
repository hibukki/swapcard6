import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Send, Reply, X, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface ChatRoomProps {
  chatRoomId: Id<"chatRooms">;
  currentUserId: Id<"users">;
  maxHeight?: string;
  autoFocus?: boolean;
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatRoom({
  chatRoomId,
  currentUserId,
  maxHeight = "h-96",
  autoFocus = false,
}: ChatRoomProps) {
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.chatRoomMessages.listByRoom, { chatRoomId })
  );
  const { data: participants } = useSuspenseQuery(
    convexQuery(api.chatRoomUsers.listByRoom, { chatRoomId })
  );

  const sendMessage = useMutation(api.chatRoomMessages.send);

  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Doc<"chatRoomMessages"> | null>(
    null
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const participantsMap = new Map(participants.map((p) => [p._id, p]));

  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 50;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      setIsAtBottom(checkIfAtBottom());
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const timeout = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

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
      setNewMessage(messageToSend);
      setReplyingTo(replyTo);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
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
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto space-y-1 p-2"
        >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const sender = participantsMap.get(message.senderId);
            const isCurrentUser = message.senderId === currentUserId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showSender =
              !prevMessage || prevMessage.senderId !== message.senderId;
            const parentMessage = getParentMessage(message.parentMessageId);

            return (
              <div
                key={message._id}
                className={`group flex ${isCurrentUser ? "justify-start" : "justify-end"} ${showSender ? "mt-3" : "mt-0.5"}`}
              >
                <div className={`flex gap-1.5 max-w-[80%] ${isCurrentUser ? "flex-row" : "flex-row-reverse"}`}>
                  {/* Avatar */}
                  <div className="w-6 flex-shrink-0 self-end">
                    {showSender && sender?.imageUrl && (
                      <img
                        src={sender.imageUrl}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex flex-col ${isCurrentUser ? "items-start" : "items-end"}`}>
                    {showSender && (
                      <span className="text-xs text-muted-foreground mb-0.5 px-1">
                        {isCurrentUser ? "You" : (sender?.name ?? "Unknown")} · {formatMessageTime(message._creationTime)}
                      </span>
                    )}

                    {/* Reply indicator */}
                    {parentMessage && (
                      <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2 mb-1 max-w-full truncate">
                        ↩ {participantsMap.get(parentMessage.senderId)?.name ?? "Unknown"}: {parentMessage.content.slice(0, 30)}
                        {parentMessage.content.length > 30 ? "..." : ""}
                      </div>
                    )}

                    <div className={`px-3 py-1.5 rounded-2xl text-sm break-words ${isCurrentUser ? "bg-primary text-primary-foreground rounded-bl-sm" : "bg-muted rounded-br-sm"}`}>
                      {message.content}
                    </div>
                  </div>

                  {/* Reply button - always visible on mobile, hover on desktop */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setReplyingTo(message);
                      inputRef.current?.focus();
                    }}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 self-center"
                    title="Reply"
                  >
                    <Reply className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
          <div ref={messagesEndRef} />
        </div>
        {!isAtBottom && (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted text-sm">
          <Reply className="w-3 h-3" />
          <span className="truncate flex-1">
            Replying to{" "}
            {participantsMap.get(replyingTo.senderId)?.name ?? "Unknown"}:{" "}
            {replyingTo.content.slice(0, 50)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setReplyingTo(null)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Error message */}
      {sendError && (
        <div className="px-2 py-1 bg-destructive/10 text-destructive text-sm">
          {sendError}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-2 border-t">
        <Textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 min-h-[2.5rem] max-h-24 resize-none"
          rows={1}
          disabled={isSending}
        />
        <Button
          onClick={() => void handleSend()}
          disabled={!newMessage.trim() || isSending}
          size="icon"
          aria-label="Send message"
        >
          {isSending ? <Spinner size="xs" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
