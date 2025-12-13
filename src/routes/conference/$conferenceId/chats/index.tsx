import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/conference/$conferenceId/chats/")({
  component: ChatsIndex,
});

function ChatsIndex() {
  return (
    <CardContent className="flex flex-col items-center justify-center text-muted-foreground gap-2 flex-1">
      <MessageSquare className="h-12 w-12 opacity-50" />
      <div>Select a conversation</div>
    </CardContent>
  );
}
