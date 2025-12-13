import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { MessageSquarePlus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserMultiSelect } from "@/components/UserMultiSelect";
import { handleMutationError } from "@/lib/error-handling";

interface NewChatDialogProps {
  conferenceId: string;
}

export function NewChatDialog({ conferenceId }: NewChatDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedUsers, setSelectedUsers] = React.useState<Doc<"users">[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);
  const navigate = useNavigate();
  const getOrCreateChatRoom = useMutation(api.chatRooms.getOrCreate);

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const chatRoomId = await getOrCreateChatRoom({
        participantIds: selectedUsers.map((u) => u._id),
      });

      setOpen(false);
      setSelectedUsers([]);

      void navigate({
        to: "/conference/$conferenceId/chat/$chatRoomId",
        params: { conferenceId, chatRoomId },
      });
    } catch (error) {
      handleMutationError(error, "Failed to create chat");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedUsers([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
          <DialogDescription>
            Search and select one or more people to start a conversation with.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <UserMultiSelect
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            placeholder="Search for people..."
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleStartChat()}
            disabled={selectedUsers.length === 0 || isCreating}
          >
            {isCreating ? "Creating..." : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
