import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const myMeetingsQuery = convexQuery(api.meetings.getMyMeetings, {});
const publicMeetingsQuery = convexQuery(api.meetings.getPublicMeetings, {});

export const Route = createFileRoute("/calendar")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(myMeetingsQuery),
        queryClient.ensureQueryData(publicMeetingsQuery),
      ]);
    }
  },
  component: CalendarPage,
});

function CalendarPage() {
  const { data: myMeetings } = useSuspenseQuery(myMeetingsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [calendarMode, setCalendarMode] = useState<"my" | "public" | "combined">("my");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get IDs of meetings the user is already in
  const myMeetingIds = new Set(myMeetings.map((m) => m._id));

  // Transform public meetings, marking those the user is in
  const publicMeetings = publicMeetingsData.map((meeting) => {
    const userIsParticipant = myMeetingIds.has(meeting._id);
    return {
      ...meeting,
      userRole: meeting.participants.some((p: any) => p.role === "creator")
        ? ("creator" as const)
        : ("participant" as const),
      isPublicMeeting: true, // Mark as public for styling
      userIsParticipant, // Track if user is already in this meeting
    };
  });

  // Mark my meetings for styling
  const myMeetingsWithFlag = myMeetings.map((meeting) => ({
    ...meeting,
    isMyMeeting: true,
  }));

  // Determine which meetings to show
  let meetings;
  if (calendarMode === "my") {
    meetings = myMeetingsWithFlag;
  } else if (calendarMode === "public") {
    // Show all public meetings (including ones user is in)
    meetings = publicMeetings;
  } else {
    // Combined view - show my meetings + public meetings I'm NOT in
    const publicMeetingsNotIn = publicMeetings.filter((m) => !m.userIsParticipant);
    meetings = [...myMeetingsWithFlag, ...publicMeetingsNotIn];
  }

  // Navigate dates
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="not-prose h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button className="btn btn-primary btn-sm" onClick={goToToday}>
            Today
          </button>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={navigatePrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={navigateNext}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold ml-2">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="join">
            <button
              className={`btn btn-sm join-item ${calendarMode === "my" ? "btn-active" : ""}`}
              onClick={() => setCalendarMode("my")}
            >
              My Meetings
            </button>
            <button
              className={`btn btn-sm join-item ${calendarMode === "public" ? "btn-active" : ""}`}
              onClick={() => setCalendarMode("public")}
            >
              Public Events
            </button>
            <button
              className={`btn btn-sm join-item ${calendarMode === "combined" ? "btn-active" : ""}`}
              onClick={() => setCalendarMode("combined")}
            >
              Combined
            </button>
          </div>
          <div className="join">
            <button
              className={`btn btn-sm join-item ${view === "week" ? "btn-active" : ""}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`btn btn-sm join-item ${view === "month" ? "btn-active" : ""}`}
              onClick={() => setView("month")}
            >
              Month
            </button>
          </div>
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            Create Meeting
          </button>
        </div>
      </div>

      {/* Legend for combined view */}
      {calendarMode === "combined" && (
        <div className="flex items-center gap-4 text-sm mb-4 p-3 bg-base-200 rounded-lg">
          <span className="font-semibold">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 border-l-4 border-primary"></div>
            <span>My Private Meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success/20 border-l-4 border-success"></div>
            <span>Public Meetings I'm In</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary/20 border-l-4 border-secondary"></div>
            <span>Available Public Events</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {view === "week" ? (
        <WeekView meetings={meetings} currentDate={currentDate} />
      ) : (
        <MonthView meetings={meetings} currentDate={currentDate} />
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function WeekView({
  meetings,
  currentDate,
}: {
  meetings: any[];
  currentDate: Date;
}) {
  // Get the start of the week (Sunday)
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  // Generate 7 days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Hours to display (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="flex-1 overflow-auto border border-base-300 rounded-lg">
      <div className="grid grid-cols-8 min-w-[800px]">
        {/* Time column header */}
        <div className="sticky top-0 bg-base-200 border-b border-base-300 p-2 text-center text-sm font-semibold z-10"></div>

        {/* Day headers */}
        {weekDays.map((date, i) => {
          const isToday =
            date.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={`sticky top-0 bg-base-200 border-b border-l border-base-300 p-2 text-center text-sm z-10 ${
                isToday ? "text-primary font-bold" : ""
              }`}
            >
              <div>
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-2xl ${isToday ? "bg-primary text-primary-content rounded-full w-8 h-8 mx-auto flex items-center justify-center" : ""}`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}

        {/* Time slots */}
        {hours.map((hour) => (
          <>
            {/* Time label */}
            <div
              key={`time-${hour}`}
              className="bg-base-100 border-b border-base-300 p-2 text-xs text-right text-base-content/60 sticky left-0"
            >
              {hour === 0 || hour === 12
                ? "12"
                : hour > 12
                  ? hour - 12
                  : hour}
              {hour < 12 ? " AM" : " PM"}
            </div>

            {/* Day columns */}
            {weekDays.map((date, dayIndex) => {
              // Find meetings in this time slot
              const slotStart = new Date(date);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(date);
              slotEnd.setHours(hour + 1, 0, 0, 0);

              const slotMeetings = meetings.filter((meeting) => {
                const meetingStart = new Date(meeting.scheduledTime);
                const meetingEnd = new Date(
                  meeting.scheduledTime + meeting.duration * 60000
                );
                return meetingStart < slotEnd && meetingEnd > slotStart;
              });

              return (
                <div
                  key={`${hour}-${dayIndex}`}
                  className="border-b border-l border-base-300 p-1 min-h-[60px] relative hover:bg-base-200/50 transition-colors"
                >
                  {slotMeetings.map((meeting) => {
                    const meetingStart = new Date(meeting.scheduledTime);
                    const isFirstSlot = meetingStart.getHours() === hour;

                    if (!isFirstSlot) return null;

                    return (
                      <MeetingCard key={meeting._id} meeting={meeting} />
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  meetings,
  currentDate,
}: {
  meetings: any[];
  currentDate: Date;
}) {
  // Get first day of month
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Get the day of week for first day (0 = Sunday)
  const startDay = firstDay.getDay();

  // Total days in month
  const daysInMonth = lastDay.getDate();

  // Generate calendar days (including padding)
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null); // Empty days before month starts
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 overflow-auto border border-base-300 rounded-lg">
      <div className="grid grid-cols-7 h-full">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="sticky top-0 bg-base-200 border-b border-r border-base-300 p-2 text-center text-sm font-semibold z-10"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="border-r border-b border-base-300 bg-base-200/30 min-h-[100px]"
              />
            );
          }

          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          );
          const isToday = date.toDateString() === new Date().toDateString();

          // Get meetings for this day
          const dayMeetings = meetings.filter((meeting) => {
            const meetingDate = new Date(meeting.scheduledTime);
            return meetingDate.toDateString() === date.toDateString();
          });

          return (
            <div
              key={day}
              className="border-r border-b border-base-300 p-2 min-h-[100px] hover:bg-base-200/50 transition-colors"
            >
              <div
                className={`text-sm mb-1 ${isToday ? "bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center font-bold" : ""}`}
              >
                {day}
              </div>
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((meeting) => {
                  const isMyMeeting = meeting.isMyMeeting;
                  const isPublicMeeting = meeting.isPublicMeeting;

                  let bgColor = "bg-primary/20";
                  let textColor = "text-primary-content";

                  if (isMyMeeting && !isPublicMeeting) {
                    bgColor = "bg-primary/20";
                    textColor = "text-primary-content";
                  } else if (isPublicMeeting && !isMyMeeting) {
                    bgColor = "bg-secondary/20";
                    textColor = "text-secondary-content";
                  } else if (isMyMeeting && isPublicMeeting) {
                    bgColor = "bg-success/20";
                    textColor = "text-success-content";
                  }

                  return (
                    <div
                      key={meeting._id}
                      className={`text-xs ${bgColor} ${textColor} p-1 rounded truncate`}
                    >
                      {new Date(meeting.scheduledTime).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}{" "}
                      {meeting.title}
                    </div>
                  );
                })}
                {dayMeetings.length > 3 && (
                  <div className="text-xs text-base-content/60">
                    +{dayMeetings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: any }) {
  const startTime = new Date(meeting.scheduledTime);
  const endTime = new Date(meeting.scheduledTime + meeting.duration * 60000);

  // Determine color based on meeting type
  const isMyMeeting = meeting.isMyMeeting;
  const isPublicMeeting = meeting.isPublicMeeting;

  let bgColor = "bg-primary/20";
  let borderColor = "border-primary";
  let textColor = "text-primary-content";

  if (isMyMeeting && !isPublicMeeting) {
    // My private meetings - primary blue
    bgColor = "bg-primary/20";
    borderColor = "border-primary";
    textColor = "text-primary-content";
  } else if (isPublicMeeting && !isMyMeeting) {
    // Public meetings I'm not in - secondary/accent color
    bgColor = "bg-secondary/20";
    borderColor = "border-secondary";
    textColor = "text-secondary-content";
  } else if (isMyMeeting && isPublicMeeting) {
    // Public meetings I'm in - success green
    bgColor = "bg-success/20";
    borderColor = "border-success";
    textColor = "text-success-content";
  }

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-1 rounded text-xs mb-1`}>
      <div className={`font-semibold ${textColor} truncate`}>
        {meeting.title}
      </div>
      <div className="text-base-content/80">
        {startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        -{" "}
        {endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>
      {meeting.participants && (
        <div className="text-base-content/60 truncate">
          {meeting.participants.length} participant
          {meeting.participants.length !== 1 ? "s" : ""}
        </div>
      )}
      {isPublicMeeting && !isMyMeeting && (
        <div className="text-xs opacity-70 mt-0.5">📢 Public</div>
      )}
    </div>
  );
}

function CreateMeetingModal({ onClose }: { onClose: () => void }) {
  const createMeeting = useMutation(api.meetings.createMeeting);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: "",
    duration: 30,
    location: "",
    isPublic: false,
    maxParticipants: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scheduledTime = new Date(formData.scheduledTime).getTime();

    await createMeeting({
      title: formData.title,
      description: formData.description || undefined,
      scheduledTime,
      duration: formData.duration,
      location: formData.location || undefined,
      isPublic: formData.isPublic,
      maxParticipants: formData.maxParticipants,
    });

    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Create Meeting</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
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
              placeholder="Optional"
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData({ ...formData, isPublic: e.target.checked })
                }
              />
              <span className="label-text">Public meeting (anyone can join)</span>
            </label>
          </div>

          {formData.isPublic && (
            <div>
              <label className="label">
                <span className="label-text">Max Participants</span>
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
                placeholder="Unlimited"
              />
            </div>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Meeting
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
