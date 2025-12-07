import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MeetingCard } from "../components/MeetingCard";
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
import { EmptyState } from "@/components/patterns/EmptyState";

const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});
const myParticipationsQuery = convexQuery(
  api.meetingParticipants.listMeetingsForCurrentUser,
  {},
);

export const Route = createFileRoute("/public-meetings")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(publicMeetingsQuery),
        queryClient.ensureQueryData(myParticipationsQuery),
      ]);
    }
  },
  component: PublicMeetingsPage,
});

function PublicMeetingsPage() {
  const { data: meetings } = useSuspenseQuery(publicMeetingsQuery);
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Build map of meetingId -> user's status
  const statusByMeetingId = useMemo(() => {
    const map = new Map<
      Id<"meetings">,
      "creator" | "accepted" | "pending" | "declined"
    >();
    for (const p of myParticipations) {
      map.set(p.meetingId, p.status);
    }
    return map;
  }, [myParticipations]);

  // Separate upcoming and past meetings
  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => m.scheduledTime >= now);
  const pastMeetings = meetings.filter((m) => m.scheduledTime < now);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Button className="not-prose mt-4" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Public Meeting
        </Button>
      </div>

      <div className="not-prose mt-8 space-y-8">
        {/* Upcoming Public Meetings */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length === 0 ? (
            <EmptyState description="No upcoming public meetings" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  userStatus={statusByMeetingId.get(meeting._id)}
                  variant="compact"
                  showMeetingLink
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Public Meetings */}
        {pastMeetings.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 opacity-50" />
              Past Meetings ({pastMeetings.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 opacity-60">
              {pastMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  userStatus={statusByMeetingId.get(meeting._id)}
                  variant="compact"
                  showActions={false}
                  showMeetingLink
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create Public Meeting Modal */}
      <CreatePublicMeetingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

function CreatePublicMeetingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useMutation(api.meetings.create);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: "",
    duration: 60,
    location: "",
    maxParticipants: undefined as number | undefined,
  });

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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
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
