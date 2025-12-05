import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  MessageCircle,
  MessageSquare,
  Search,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";

const usersQuery = convexQuery(api.users.listUsers, {});

const attendeesSearchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/attendees")({
  validateSearch: attendeesSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session)
      await queryClient.ensureQueryData(usersQuery);
  },
  component: AttendeesPage,
});

function matchesSearch(user: Doc<"users">, query: string): boolean {
  const q = query.toLowerCase();
  if (user.name.toLowerCase().includes(q)) return true;
  if (user.role?.toLowerCase().includes(q)) return true;
  if (user.company?.toLowerCase().includes(q)) return true;
  if (user.bio?.toLowerCase().includes(q)) return true;
  if (user.interests?.some((i) => i.toLowerCase().includes(q))) return true;
  if (user.canHelpWith?.toLowerCase().includes(q)) return true;
  if (user.needsHelpWith?.toLowerCase().includes(q)) return true;
  return false;
}

function AttendeesPage() {
  const { data: users } = useSuspenseQuery(usersQuery);
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const search = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState(search.q ?? "");

  // Update search query when URL param changes
  useEffect(() => {
    if (search.q !== undefined) {
      setSearchQuery(search.q);
    }
  }, [search.q]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((user) => matchesSearch(user, searchQuery.trim()));
  }, [users, searchQuery]);

  return (
    <div>
      <div className="not-prose mt-6 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
          <input
            type="text"
            className="input input-bordered w-full pl-10 pr-10"
            placeholder="Search by name, role, company, interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm opacity-70 mt-2">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "result" : "results"}
          </p>
        )}
      </div>

      {filteredUsers.length === 0 ? (
        <div className="not-prose">
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">
              {searchQuery
                ? "No attendees match your search"
                : "No other attendees yet. Be the first to connect!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
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

                {user.canHelpWith && (
                  <div className="mt-3">
                    <p className="text-xs font-medium opacity-60 mb-1">
                      Can help with
                    </p>
                    <p className="text-sm opacity-80 line-clamp-2">
                      {user.canHelpWith}
                    </p>
                  </div>
                )}

                {user.needsHelpWith && (
                  <div className="mt-3">
                    <p className="text-xs font-medium opacity-60 mb-1">
                      Looking for help with
                    </p>
                    <p className="text-sm opacity-80 line-clamp-2">
                      {user.needsHelpWith}
                    </p>
                  </div>
                )}

                <div className="card-actions mt-4 flex gap-2">
                  <Link
                    to="/user/$userId"
                    params={{ userId: user._id }}
                    className="btn btn-ghost btn-sm btn-square"
                    title="Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                  <button
                    className="btn btn-primary btn-sm flex-1"
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
          recipientName={users.find((u) => u._id === selectedUser)?.name ?? ""}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

type BusySlot = { start: number; end: number };

function generateTimeSlots(
  date: Date,
  duration: number,
  myBusySlots: BusySlot[],
  theirBusySlots: BusySlot[],
): number[] {
  const allBusySlots = [...myBusySlots, ...theirBusySlots];
  const slots: number[] = [];

  // Generate slots from 8:00 AM to 6:00 PM (last slot at 5:30 PM for 30 min meeting)
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0);

  for (
    let time = dayStart.getTime();
    time < dayEnd.getTime();
    time += 30 * 60 * 1000
  ) {
    const slotEnd = time + duration * 60 * 1000;
    if (slotEnd > dayEnd.getTime()) break;

    const isAvailable = !allBusySlots.some(
      (busy) => time < busy.end && slotEnd > busy.start,
    );
    if (isAvailable) {
      slots.push(time);
    }
  }

  return slots;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function MeetingRequestModal({
  recipientId,
  recipientName,
  onClose,
}: {
  recipientId: Id<"users">;
  recipientName: string;
  onClose: () => void;
}) {
  const sendRequest = useMutation(api.meetingParticipants.sendRequest);
  const currentUser = useQuery(api.users.getCurrentUser);
  const conferences = useQuery(api.conferences.list);

  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState<20 | 30>(30);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get conference date bounds
  const conference = conferences?.[0];
  const minDate = conference ? new Date(conference.startDate) : new Date();
  const maxDate = conference
    ? new Date(conference.endDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Initialize selected date to conference start (or today if within range)
  useEffect(() => {
    if (conference && !selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const confStart = new Date(conference.startDate);
      confStart.setHours(0, 0, 0, 0);
      const confEnd = new Date(conference.endDate);
      confEnd.setHours(23, 59, 59, 999);

      if (today >= confStart && today <= confEnd) {
        setSelectedDate(today);
      } else if (today < confStart) {
        setSelectedDate(confStart);
      } else {
        setSelectedDate(confStart);
      }
    }
  }, [conference, selectedDate]);

  // Fetch busy slots for both users
  const dayStart = selectedDate
    ? new Date(selectedDate).setHours(0, 0, 0, 0)
    : 0;
  const dayEnd = selectedDate
    ? new Date(selectedDate).setHours(23, 59, 59, 999)
    : 0;

  const myBusySlots = useQuery(
    api.meetings.getBusySlots,
    currentUser && selectedDate
      ? { userId: currentUser._id, startDate: dayStart, endDate: dayEnd }
      : "skip",
  );

  const theirBusySlots = useQuery(
    api.meetings.getBusySlots,
    selectedDate
      ? { userId: recipientId, startDate: dayStart, endDate: dayEnd }
      : "skip",
  );

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Generate available time slots
  const availableSlots = useMemo(() => {
    if (!selectedDate || !myBusySlots || !theirBusySlots) return [];
    return generateTimeSlots(
      selectedDate,
      duration,
      myBusySlots,
      theirBusySlots,
    );
  }, [selectedDate, duration, myBusySlots, theirBusySlots]);

  // Auto-select first available slot when slots change
  useEffect(() => {
    if (availableSlots.length > 0) {
      setSelectedSlot(availableSlots[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [availableSlots]);

  const canGoBack = selectedDate && selectedDate > minDate;
  const canGoForward = selectedDate && selectedDate < maxDate;

  const goToPreviousDay = () => {
    if (selectedDate && canGoBack) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    }
  };

  const goToNextDay = () => {
    if (selectedDate && canGoForward) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot) {
      return;
    }

    setIsSubmitting(true);
    try {
      await sendRequest({
        recipientId,
        title: `Meeting with ${recipientName}`,
        description: undefined,
        location: location || undefined,
        scheduledTime: selectedSlot,
        duration,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    !currentUser ||
    !conferences ||
    myBusySlots === undefined ||
    theirBusySlots === undefined;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-md">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-lg mt-0 pr-8">
          Request Meeting with {recipientName}
        </h3>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-4 space-y-4"
        >
          {/* Duration toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <div className="join">
              <button
                type="button"
                className={`join-item btn ${duration === 20 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setDuration(20)}
              >
                20 min
              </button>
              <button
                type="button"
                className={`join-item btn ${duration === 30 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setDuration(30)}
              >
                30 min
              </button>
            </div>
          </div>

          {/* Available times section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">Available Times</label>
              <Tippy
                content={`Shows times when both you and ${recipientName} are free, based on calendars (including private meetings and public events)`}
                appendTo={() => document.body}
              >
                <span>
                  <Info className="w-4 h-4 opacity-50 cursor-help" />
                </span>
              </Tippy>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : (
              <>
                {/* Day navigation */}
                <div className="flex items-center justify-between bg-base-200 rounded-t-lg px-3 py-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={goToPreviousDay}
                    disabled={!canGoBack}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium">
                    {selectedDate && formatDateHeader(selectedDate)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={goToNextDay}
                    disabled={!canGoForward}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Time slots grid */}
                <div className="bg-base-200 rounded-b-lg p-3 max-h-48 overflow-y-auto">
                  {availableSlots.length === 0 ? (
                    <p className="text-center opacity-70 py-4 text-sm">
                      No available times on this day
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`btn btn-sm ${selectedSlot === slot ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
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
              disabled={isSubmitting || !selectedSlot}
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
