import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MeetingCard } from "../components/MeetingCard";

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
        <button
          className="not-prose btn btn-primary gap-2 mt-4"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Create Public Meeting
        </button>
      </div>

      <div className="not-prose mt-8 space-y-8">
        {/* Upcoming Public Meetings */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length === 0 ? (
            <div className="p-6 bg-base-200 rounded-lg text-center opacity-70">
              No upcoming public meetings
            </div>
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
      {showCreateModal && (
        <CreatePublicMeetingModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreatePublicMeetingModal({ onClose }: { onClose: () => void }) {
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
    });

    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Create Public Meeting</h3>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Meeting Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Networking Coffee Break, Product Demo Session"
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What will you discuss? Who should join?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Date & Time</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={formData.scheduledTime}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Duration (minutes)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
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

          <div>
            <label className="label">
              <span className="label-text">Location</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Room name, Zoom link, or meeting point"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Max Participants (optional)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
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

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Public Meeting
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
