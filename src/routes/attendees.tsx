import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { MessageSquare, UserPlus } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const usersQuery = convexQuery(api.users.listUsers, {});

export const Route = createFileRoute("/attendees")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session)
      await queryClient.ensureQueryData(usersQuery);
  },
  component: AttendeesPage,
});

function AttendeesPage() {
  const { data: users } = useSuspenseQuery(usersQuery);
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);

  return (
    <div>
      <h1 className="mt-0">Attendees</h1>
      <p>Browse conference attendees and send meeting requests</p>

      {users.length === 0 ? (
        <div className="not-prose mt-8">
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">
              No other attendees yet. Be the first to connect!
            </p>
          </div>
        </div>
      ) : (
        <div className="not-prose mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <div key={user._id} className="card card-border bg-base-200">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="avatar avatar-placeholder">
                      <div className="w-12 rounded-full bg-neutral text-neutral-content">
                        <span className="text-xl">{user.name[0]}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="card-title text-base mt-0">{user.name}</h3>
                    {user.role && (
                      <p className="text-sm opacity-80">{user.role}</p>
                    )}
                    {user.company && (
                      <p className="text-sm opacity-60">{user.company}</p>
                    )}
                  </div>
                </div>

                {user.bio && (
                  <p className="text-sm opacity-80 mt-2 line-clamp-3">
                    {user.bio}
                  </p>
                )}

                {user.interests && user.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.interests.slice(0, 3).map((interest, i) => (
                      <span key={i} className="badge badge-sm">
                        {interest}
                      </span>
                    ))}
                    {user.interests.length > 3 && (
                      <span className="badge badge-sm">
                        +{user.interests.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="card-actions mt-4">
                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => setSelectedUser(user._id)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Request Meeting
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <MeetingRequestModal
          recipientId={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function MeetingRequestModal({
  recipientId,
  onClose,
}: {
  recipientId: Id<"users">;
  onClose: () => void;
}) {
  const sendRequest = useMutation(api.meetings.sendMeetingRequest);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendRequest({
        recipientId,
        message: message || undefined,
        location: location || undefined,
        proposedDuration: 30,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mt-0">Send Meeting Request</h3>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Message (optional)
            </label>
            <textarea
              className="textarea textarea-border w-full"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them why you'd like to meet..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              className="input input-border w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Coffee shop, booth #5, etc."
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <MessageSquare className="w-4 h-4" />
              {isSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
