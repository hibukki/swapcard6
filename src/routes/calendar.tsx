import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import React, { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { z } from "zod";

const myMeetingsQuery = convexQuery(api.meetings.getMyMeetings, {});
const publicMeetingsQuery = convexQuery(api.meetings.getPublicMeetings, {});
const pendingInvitationsQuery = convexQuery(api.meetings.getPendingInvitations, {});
const sentRequestsQuery = convexQuery(api.meetings.getSentRequests, {});

const calendarSearchSchema = z.object({
  view: z.enum(["week", "month"]).optional().default("week"),
  mode: z.enum(["my", "public", "combined"]).optional().default("my"),
  date: z.string().optional(),
});

export const Route = createFileRoute("/calendar")({
  validateSearch: calendarSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(myMeetingsQuery),
        queryClient.ensureQueryData(publicMeetingsQuery),
        queryClient.ensureQueryData(pendingInvitationsQuery),
        queryClient.ensureQueryData(sentRequestsQuery),
      ]);
    }
  },
  component: CalendarPage,
});

function CalendarPage() {
  const { data: myMeetings } = useSuspenseQuery(myMeetingsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);
  const { data: pendingInvitations } = useSuspenseQuery(pendingInvitationsQuery);
  const { data: sentRequests } = useSuspenseQuery(sentRequestsQuery);
  const navigate = useNavigate({ from: "/calendar" });
  const search = Route.useSearch();

  // Use URL params with defaults, fallback to localStorage
  const view = search.view;
  const calendarMode = search.mode;
  const currentDate = search.date ? new Date(search.date) : new Date();

  // On mount, restore from localStorage if URL params match defaults (meaning user just clicked nav link)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlView = new URLSearchParams(window.location.search).get("view");
      const urlMode = new URLSearchParams(window.location.search).get("mode");
      const urlDate = new URLSearchParams(window.location.search).get("date");

      // Only restore if URL params are missing or match defaults
      const shouldRestore = !urlView && !urlMode && !urlDate;

      if (shouldRestore) {
        const savedView = localStorage.getItem("calendarView");
        const savedMode = localStorage.getItem("calendarMode");
        const savedDate = localStorage.getItem("calendarDate");

        if (savedView || savedMode || savedDate) {
          void navigate({
            search: {
              view: (savedView as "week" | "month") || "week",
              mode: (savedMode as "my" | "public" | "combined") || "my",
              date: savedDate || undefined,
            },
            replace: true,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Save calendar state to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("calendarView", view);
      localStorage.setItem("calendarMode", calendarMode);
      if (search.date) {
        localStorage.setItem("calendarDate", search.date);
      }
    }
  }, [view, calendarMode, search.date]);

  // Helper to update URL params
  const updateSearch = (updates: Partial<typeof search>) => {
    void navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  type Meeting = FunctionReturnType<typeof api.meetings.getMyMeetings>[number];
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const setView = (newView: "week" | "month") => updateSearch({ view: newView });
  const setCalendarMode = (newMode: "my" | "public" | "combined") => updateSearch({ mode: newMode });
  const setCurrentDate = (date: Date) => updateSearch({ date: date.toISOString().split('T')[0] });

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

  // Convert pending invitations and sent requests to calendar events
  const pendingRequests = [
    ...sentRequests.map((meeting) => ({
      _id: meeting._id,
      title: `Meeting Request to ${meeting.recipients.map((r) => r.name).join(", ")}`,
      scheduledTime: meeting.scheduledTime,
      duration: meeting.duration,
      location: meeting.location,
      description: meeting.description,
      isPendingRequest: true,
      isOutgoing: true,
      participants: meeting.recipients,
      pendingParticipants: meeting.recipients,
      userRole: "creator" as const,
    })),
    ...pendingInvitations.map((meeting) => ({
      _id: meeting._id,
      title: `Meeting Request from ${meeting.requester?.name || "Unknown"}`,
      scheduledTime: meeting.scheduledTime,
      duration: meeting.duration,
      location: meeting.location,
      description: meeting.description,
      isPendingRequest: true,
      isOutgoing: false,
      participants: meeting.requester ? [meeting.requester] : [],
      pendingParticipants: meeting.requester ? [meeting.requester] : [],
      requester: meeting.requester,
      userRole: "pending" as const,
    })),
  ];

  // Determine which meetings to show
  let meetings;
  if (calendarMode === "my") {
    meetings = [...myMeetingsWithFlag, ...pendingRequests];
  } else if (calendarMode === "public") {
    // Show all public meetings (including ones user is in)
    meetings = publicMeetings;
  } else {
    // Combined view - show my meetings + public meetings I'm NOT in + pending requests
    const publicMeetingsNotIn = publicMeetings.filter((m) => !m.userIsParticipant);
    meetings = [...myMeetingsWithFlag, ...publicMeetingsNotIn, ...pendingRequests];
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
        </div>
      </div>

      {/* Legend */}
      {(calendarMode === "combined" || calendarMode === "my") && (
        <div className="flex items-center gap-4 text-sm mb-4 p-3 bg-base-200 rounded-lg flex-wrap">
          <span className="font-semibold">Legend:</span>
          {calendarMode === "combined" && (
            <>
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
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning/20 border-l-4 border-warning"></div>
            <span>Pending Requests</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {view === "week" ? (
        <WeekView meetings={meetings} currentDate={currentDate} onMeetingClick={setSelectedMeeting} />
      ) : (
        <MonthView meetings={meetings} currentDate={currentDate} onMeetingClick={setSelectedMeeting} />
      )}

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}

function WeekView({
  meetings,
  currentDate,
  onMeetingClick,
}: {
  meetings: any[];
  currentDate: Date;
  onMeetingClick: (meeting: any) => void;
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
                      <MeetingCard
                        key={meeting._id}
                        meeting={meeting}
                        onClick={() => onMeetingClick(meeting)}
                      />
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
  onMeetingClick,
}: {
  meetings: any[];
  currentDate: Date;
  onMeetingClick: (meeting: any) => void;
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
                  const isPendingRequest = meeting.isPendingRequest;

                  let bgColor = "bg-primary/20";
                  let textColor = "text-primary-content";

                  if (isPendingRequest) {
                    bgColor = "bg-warning/20";
                    textColor = "text-warning-content";
                  } else if (isMyMeeting && !isPublicMeeting) {
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
                      className={`text-xs ${bgColor} ${textColor} p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => onMeetingClick(meeting)}
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

function MeetingCard({ meeting, onClick }: { meeting: any; onClick: () => void }) {
  const startTime = new Date(meeting.scheduledTime);
  const endTime = new Date(meeting.scheduledTime + meeting.duration * 60000);

  // Determine color based on meeting type
  const isMyMeeting = meeting.isMyMeeting;
  const isPublicMeeting = meeting.isPublicMeeting;
  const isPendingRequest = meeting.isPendingRequest;

  let bgColor = "bg-primary/20";
  let borderColor = "border-primary";
  let textColor = "text-primary-content";

  if (isPendingRequest) {
    // Pending requests - warning/orange color
    bgColor = "bg-warning/20";
    borderColor = "border-warning";
    textColor = "text-warning-content";
  } else if (isMyMeeting && !isPublicMeeting) {
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
    <div
      className={`${bgColor} border-l-4 ${borderColor} p-1 rounded text-xs mb-1 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
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

function MeetingDetailModal({
  meeting,
  onClose,
}: {
  meeting: any;
  onClose: () => void;
}) {
  const joinMeeting = useMutation(api.meetings.joinMeeting);
  const leaveMeeting = useMutation(api.meetings.leaveMeeting);
  const [isLoading, setIsLoading] = useState(false);

  const isParticipant = meeting.participants?.some(
    (p: any) => p.role !== undefined
  );

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await joinMeeting({ meetingId: meeting._id });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join meeting");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leaveMeeting({ meetingId: meeting._id });
      onClose();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to leave meeting"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="font-bold text-lg">{meeting.title}</h3>
          <div className="flex gap-2">
            {meeting.isPublic && (
              <span className="badge badge-primary">Public</span>
            )}
            {meeting.isFull && <span className="badge badge-warning">Full</span>}
          </div>
        </div>

        {meeting.description && (
          <p className="text-sm opacity-80 mb-4">{meeting.description}</p>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 opacity-70" />
            <span>{new Date(meeting.scheduledTime).toLocaleString()}</span>
            <span className="opacity-70">({meeting.duration} min)</span>
          </div>

          {meeting.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 opacity-70" />
              <span>{meeting.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 opacity-70" />
            <span>
              {meeting.participantCount || meeting.participants?.length || 0}
              {meeting.maxParticipants ? ` / ${meeting.maxParticipants}` : ""}{" "}
              participants
            </span>
          </div>

          {meeting.creator && (
            <div className="text-sm">
              <span className="opacity-70">Hosted by: </span>
              <span className="font-semibold">{meeting.creator.name}</span>
            </div>
          )}
        </div>

        {/* Show participants for confirmed meetings */}
        {meeting.participants && meeting.participants.length > 0 && !meeting.isPendingRequest && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-2">Participants:</div>
            <div className="flex flex-wrap gap-2">
              {meeting.participants.map((p: any) => (
                <span key={p._id} className="badge badge-sm">
                  {p.name}
                  {p.role === "creator" && <span className="ml-1 opacity-70">(Host)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Show pending participants for pending requests */}
        {meeting.isPendingRequest && meeting.pendingParticipants && meeting.pendingParticipants.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-2">
              {meeting.isOutgoing ? "Waiting for response from:" : "Request from:"}
            </div>
            <div className="flex flex-wrap gap-2">
              {meeting.pendingParticipants.map((p: any) => (
                <span key={p._id || p.name} className="badge badge-warning badge-sm">
                  {p.name}
                  {p.role && <span className="ml-1 opacity-70">({p.role})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          {meeting.isPublic && (
            <>
              {isParticipant ? (
                <button
                  className="btn btn-error"
                  onClick={() => void handleLeave()}
                  disabled={isLoading}
                >
                  {isLoading ? "Leaving..." : "Leave Meeting"}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => void handleJoin()}
                  disabled={meeting.isFull || isLoading}
                >
                  {isLoading ? "Joining..." : "Join Meeting"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
