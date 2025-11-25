import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Clock, MapPin, UserPlus, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";

const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});
const myParticipationsQuery = convexQuery(api.meetingParticipants.listByUser, {});

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
  const allUsers = useQuery(api.users.listUsers, {});

  const join = useMutation(api.meetingParticipants.join);
  const leave = useMutation(api.meetingParticipants.leave);
  const [joiningMeetingId, setJoiningMeetingId] = useState<Id<"meetings"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Build user lookup map
  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  // Build set of meeting IDs I'm participating in
  const myMeetingIds = useMemo(() => {
    return new Set(
      myParticipations
        .filter((p) => p.status === "accepted" || p.status === "creator")
        .map((p) => p.meetingId)
    );
  }, [myParticipations]);

  const handleJoinMeeting = async (meetingId: Id<"meetings">) => {
    setJoiningMeetingId(meetingId);
    try {
      await join({ meetingId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join meeting");
    } finally {
      setJoiningMeetingId(null);
    }
  };

  const handleLeaveMeeting = async (meetingId: Id<"meetings">) => {
    setJoiningMeetingId(meetingId);
    try {
      await leave({ meetingId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave meeting");
    } finally {
      setJoiningMeetingId(null);
    }
  };

  // Separate upcoming and past meetings
  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => m.scheduledTime >= now);
  const pastMeetings = meetings.filter((m) => m.scheduledTime < now);

  if (!allUsers) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="mt-0">Public Meetings</h1>
          <p>Browse and join public meetings open to all attendees</p>
        </div>
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
              {upcomingMeetings.map((meeting) => {
                const isParticipant = myMeetingIds.has(meeting._id);
                const creator = usersMap.get(meeting.creatorId);

                return (
                  <PublicMeetingCard
                    key={meeting._id}
                    meeting={meeting}
                    creator={creator}
                    isParticipant={isParticipant}
                    isLoading={joiningMeetingId === meeting._id}
                    onJoin={() => void handleJoinMeeting(meeting._id)}
                    onLeave={() => void handleLeaveMeeting(meeting._id)}
                  />
                );
              })}
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
            <div className="grid gap-4 md:grid-cols-2">
              {pastMeetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="card card-border bg-base-200 opacity-60"
                >
                  <div className="card-body">
                    <h3 className="font-semibold">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-sm opacity-80">{meeting.description}</p>
                    )}
                    <div className="text-sm mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(meeting.scheduledTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
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

function PublicMeetingCard({
  meeting,
  creator,
  isParticipant,
  isLoading,
  onJoin,
  onLeave,
}: {
  meeting: Doc<"meetings">;
  creator: Doc<"users"> | undefined;
  isParticipant: boolean;
  isLoading: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg">{meeting.title}</h3>
          {meeting.maxParticipants && (
            <span className="badge badge-warning">
              Max {meeting.maxParticipants}
            </span>
          )}
        </div>

        {meeting.description && (
          <p className="text-sm opacity-80 mt-1">{meeting.description}</p>
        )}

        <div className="mt-3 space-y-2">
          <div className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 opacity-70" />
            <span>{new Date(meeting.scheduledTime).toLocaleString()}</span>
            <span className="opacity-70">({meeting.duration} min)</span>
          </div>

          {meeting.location && (
            <div className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-70" />
              <span>{meeting.location}</span>
            </div>
          )}

          {creator && (
            <div className="text-sm">
              <span className="opacity-70">Hosted by: </span>
              <span className="font-semibold">{creator.name}</span>
            </div>
          )}
        </div>

        <div className="card-actions mt-4">
          {isParticipant ? (
            <button
              className="btn btn-error btn-sm w-full"
              onClick={onLeave}
              disabled={isLoading}
            >
              Leave Meeting
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm w-full gap-2"
              onClick={onJoin}
              disabled={isLoading}
            >
              <UserPlus className="w-4 h-4" />
              {isLoading ? "Joining..." : "Join Meeting"}
            </button>
          )}
        </div>
      </div>
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
