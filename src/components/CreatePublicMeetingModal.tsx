import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { formatDateTimeLocal } from "@/lib/date-format";
import { LocationPicker } from "./LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CreatePublicMeetingModalProps {
  open: boolean;
  onClose: () => void;
  defaultLocation?: string;
  defaultScheduledTime?: Date;
  defaultDuration?: number;
}

export function CreatePublicMeetingModal({
  open,
  onClose,
  defaultLocation,
  defaultScheduledTime,
  defaultDuration = 60,
}: CreatePublicMeetingModalProps) {
  const create = useMutation(api.meetings.create);
  const conferences = useQuery(api.conferences.list);
  const conference = conferences?.[0];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: defaultScheduledTime
      ? formatDateTimeLocal(defaultScheduledTime)
      : "",
    duration: defaultDuration,
    location: defaultLocation ?? "",
    maxParticipants: undefined as number | undefined,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        description: "",
        scheduledTime: defaultScheduledTime
          ? formatDateTimeLocal(defaultScheduledTime)
          : "",
        duration: defaultDuration,
        location: defaultLocation ?? "",
        maxParticipants: undefined,
      });
    }
  }, [open, defaultLocation, defaultScheduledTime, defaultDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scheduledTime = new Date(formData.scheduledTime).getTime();

    await create({
      title: formData.title,
      description: formData.description || undefined,
      scheduledTime,
      duration: formData.duration,
      location: formData.location || undefined,
      isPublic: true,
      maxParticipants: formData.maxParticipants,
      addCurrentUserAs: "creator",
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Public Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Networking Coffee Break, Product Demo Session"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What will you discuss? Who should join?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Date & Time</Label>
              <Input
                id="scheduledTime"
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledTime: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: parseInt(e.target.value),
                  })
                }
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <LocationPicker
              conferenceId={conference?._id}
              value={formData.location}
              onChange={(location) => setFormData({ ...formData, location })}
              placeholder="Room name, Zoom link, or meeting point"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
            <Input
              id="maxParticipants"
              type="number"
              value={formData.maxParticipants ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxParticipants: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              min="2"
              placeholder="Leave empty for unlimited"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Public Meeting</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
