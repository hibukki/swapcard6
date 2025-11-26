import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { z } from "zod";
import { CalendarSubscription } from "../components/CalendarSubscription";
import { MeetingCard as MeetingCardComponent } from "../components/MeetingCard";
import { type CalendarMeetingView, getMeetingDisplayCategory, categoryStyles } from "../types/calendar";

const myParticipationsQuery = convexQuery(api.meetingParticipants.listMeetingsForCurrentUser, {});
const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});

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
        queryClient.ensureQueryData(myParticipationsQuery),
        queryClient.ensureQueryData(publicMeetingsQuery),
      ]);
    }
  },
  component: CalendarPage,
});


function CalendarPage() {
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);
  const allMeetings = useQuery(api.meetings.list, {});
  const allUsers = useQuery(api.users.listUsers, {});
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

  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeetingView | null>(null);

  const setView = (newView: "week" | "month") => updateSearch({ view: newView });
  const setCalendarMode = (newMode: "my" | "public" | "combined") => updateSearch({ mode: newMode });
  const setCurrentDate = (date: Date) => updateSearch({ date: date.toISOString().split('T')[0] });

  // Build lookup maps
  const meetingsMap = useMemo(() => {
    if (!allMeetings) return new Map<Id<"meetings">, Doc<"meetings">>();
    return new Map(allMeetings.map((m) => [m._id, m]));
  }, [allMeetings]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  // Build my meetings with enrichment
  const myMeetings = useMemo((): CalendarMeetingView[] => {
    const results: CalendarMeetingView[] = [];
    for (const p of myParticipations) {
      if (p.status !== "accepted" && p.status !== "creator") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;
      results.push({
        meeting,
        userStatus: {
          participationStatus: p.status,
          isPendingRequest: false,
          isOutgoing: false,
        },
        display: {
          category: getMeetingDisplayCategory(meeting, p.status, false),
        },
      });
    }
    return results;
  }, [myParticipations, meetingsMap]);

  // Get pending invitations (incoming)
  const pendingInvitations = useMemo((): CalendarMeetingView[] => {
    const results: CalendarMeetingView[] = [];
    for (const p of myParticipations) {
      if (p.status !== "pending") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;
      const requester = usersMap.get(meeting.creatorId);
      const displayTitle = `Meeting Request from ${requester?.name || "Unknown"}`;
      results.push({
        meeting: { ...meeting, title: displayTitle },
        userStatus: {
          participationStatus: "pending",
          isPendingRequest: true,
          isOutgoing: false,
        },
        display: {
          category: "pending-incoming",
        },
      });
    }
    return results;
  }, [myParticipations, meetingsMap, usersMap]);

  // Get sent requests (outgoing - meetings I created that are not public)
  const sentRequests = useMemo((): CalendarMeetingView[] => {
    const results: CalendarMeetingView[] = [];
    for (const p of myParticipations) {
      if (p.status !== "creator") continue;
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting || meeting.isPublic) continue;
      const displayTitle = `Meeting Request: ${meeting.title}`;
      results.push({
        meeting: { ...meeting, title: displayTitle },
        userStatus: {
          participationStatus: "creator",
          isPendingRequest: true,
          isOutgoing: true,
        },
        display: {
          category: "pending-outgoing",
        },
      });
    }
    return results;
  }, [myParticipations, meetingsMap]);

  // Get IDs of meetings the user is already in
  const myMeetingIds = useMemo(() => {
    return new Set(myMeetings.map((m) => m.meeting._id));
  }, [myMeetings]);

  // Transform public meetings, marking those the user is in
  const publicMeetings = useMemo((): CalendarMeetingView[] => {
    return publicMeetingsData.map((meeting): CalendarMeetingView => {
      const userIsParticipant = myMeetingIds.has(meeting._id);
      const participationStatus = userIsParticipant ? ("accepted" as const) : undefined;
      return {
        meeting,
        userStatus: {
          participationStatus,
          isPendingRequest: false,
          isOutgoing: false,
        },
        display: {
          category: getMeetingDisplayCategory(meeting, participationStatus, false),
        },
      };
    });
  }, [publicMeetingsData, myMeetingIds]);

  // Pending requests for calendar display
  const pendingRequests: CalendarMeetingView[] = useMemo(() => {
    return [...sentRequests, ...pendingInvitations];
  }, [sentRequests, pendingInvitations]);

  // Determine which meetings to show
  let meetings: CalendarMeetingView[];
  if (calendarMode === "my") {
    meetings = [...myMeetings, ...pendingRequests];
  } else if (calendarMode === "public") {
    // Show all public meetings (including ones user is in)
    meetings = publicMeetings;
  } else {
    // Combined view - show my meetings + public meetings I'm NOT in + pending requests
    const publicMeetingsNotIn = publicMeetings.filter((m) => !m.userStatus.participationStatus);
    meetings = [...myMeetings, ...publicMeetingsNotIn, ...pendingRequests];
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

  if (!allMeetings || !allUsers) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

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

      {/* Calendar Subscription */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm opacity-70 hover:opacity-100 flex items-center gap-1">
          <ChevronDown className="w-4 h-4" />
          Sync to external calendar
        </summary>
        <div className="mt-3 p-4 bg-base-200 rounded-lg">
          <CalendarSubscription />
        </div>
      </details>

      {/* Calendar Grid */}
      {view === "week" ? (
        <WeekView meetings={meetings} currentDate={currentDate} onMeetingClick={setSelectedMeeting} />
      ) : (
        <MonthView meetings={meetings} currentDate={currentDate} onMeetingClick={setSelectedMeeting} />
      )}

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          calendarMeeting={selectedMeeting}
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
  meetings: CalendarMeetingView[];
  currentDate: Date;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
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
          <React.Fragment key={`row-${hour}`}>
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

              const slotMeetings = meetings.filter((calendarMeeting) => {
                const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
                const meetingEnd = new Date(
                  calendarMeeting.meeting.scheduledTime + calendarMeeting.meeting.duration * 60000
                );
                return meetingStart < slotEnd && meetingEnd > slotStart;
              });

              return (
                <div
                  key={`${hour}-${dayIndex}`}
                  className="border-b border-l border-base-300 p-1 min-h-[60px] relative hover:bg-base-200/50 transition-colors"
                >
                  {slotMeetings.map((calendarMeeting) => {
                    const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
                    const isFirstSlot = meetingStart.getHours() === hour;

                    if (!isFirstSlot) return null;

                    return (
                      <CalendarGridCard
                        key={calendarMeeting.meeting._id}
                        calendarMeeting={calendarMeeting}
                        onClick={() => onMeetingClick(calendarMeeting)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
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
  meetings: CalendarMeetingView[];
  currentDate: Date;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
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
  const calendarDays: (number | null)[] = [];
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
          const dayMeetings = meetings.filter((calendarMeeting) => {
            const meetingDate = new Date(calendarMeeting.meeting.scheduledTime);
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
                {dayMeetings.slice(0, 3).map((calendarMeeting) => {
                  const styles = categoryStyles[calendarMeeting.display.category];

                  return (
                    <div
                      key={calendarMeeting.meeting._id}
                      className={`text-xs ${styles.bg} ${styles.text} p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => onMeetingClick(calendarMeeting)}
                    >
                      {new Date(calendarMeeting.meeting.scheduledTime).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}{" "}
                      {calendarMeeting.meeting.title}
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

function CalendarGridCard({ calendarMeeting, onClick }: { calendarMeeting: CalendarMeetingView; onClick: () => void }) {
  const { meeting, display } = calendarMeeting;
  const startTime = new Date(meeting.scheduledTime);
  const endTime = new Date(meeting.scheduledTime + meeting.duration * 60000);
  const styles = categoryStyles[display.category];
  const isPublicNotParticipant = display.category === "public-available";

  return (
    <div
      className={`${styles.bg} border-l-4 ${styles.border} p-1 rounded text-xs mb-1 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
      <Link
        to="/meeting/$meetingId"
        params={{ meetingId: meeting._id }}
        className={`font-semibold ${styles.text} truncate block hover:underline`}
        onClick={(e) => e.stopPropagation()}
      >
        {meeting.title}
      </Link>
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
      {isPublicNotParticipant && (
        <div className="text-xs opacity-70 mt-0.5">📢 Public</div>
      )}
    </div>
  );
}

function MeetingDetailModal({
  calendarMeeting,
  onClose,
}: {
  calendarMeeting: CalendarMeetingView;
  onClose: () => void;
}) {
  const { meeting, userStatus } = calendarMeeting;
  const status = userStatus.participationStatus ?? (
    userStatus.isPendingRequest && !userStatus.isOutgoing ? "pending" :
    userStatus.participationStatus === "accepted" || userStatus.participationStatus === "creator" ? "accepted" :
    null
  );

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl p-0">
        <MeetingCardComponent
          meeting={meeting}
          userStatus={status}
          variant="full"
          showParticipants
          showActions
          showMeetingLink
          onActionComplete={onClose}
        />
        <div className="px-6 pb-6">
          <button type="button" className="btn btn-block" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
