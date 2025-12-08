import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Users } from "lucide-react";

const publicChatRoomsQuery = convexQuery(api.chatRooms.listPublic, {});

export const Route = createFileRoute("/public-chats")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(publicChatRoomsQuery);
    }
  },
  component: PublicChatsPage,
});

function PublicChatsPage() {
  const { data: rooms } = useSuspenseQuery(publicChatRoomsQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createRoom = useMutation(api.chatRooms.createPublic);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setError("Room name cannot be empty");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await createRoom({ name: newRoomName.trim() });
      setNewRoomName("");
      setIsDialogOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="not-prose">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chat Rooms</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chat Room</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-4">
              <Input
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleCreateRoom();
                  }
                }}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={() => void handleCreateRoom()} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p>No chat rooms yet</p>
            <p className="text-sm">Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room._id}
              to="/public-chat/$chatRoomId"
              params={{ chatRoomId: room._id }}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {room.name || "Unnamed Room"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {room.lastMessageAt
                        ? `Last message: ${new Date(room.lastMessageAt).toLocaleDateString()}`
                        : "No messages yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
