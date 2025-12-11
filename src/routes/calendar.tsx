import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import React, { useState, useMemo } from "react";
import Tippy from "@tippyjs/react";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { z } from "zod";
import { CalendarSubscription } from "../components/CalendarSubscription";
import { MeetingCard as MeetingCardComponent } from "../components/MeetingCard";
import {
  type CalendarMeetingView,
  type ParticipantSummary,
  getMeetingDisplayCategory,
  categoryStyles,
  getEventTooltip,
} from "../types/calendar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

/** Map of meeting ID to list of other participant user IDs */
type MeetingParticipantsMap = Record<Id<"meetings">, Id<"users">[]>;

const myParticipationsQuery = convexQuery(api.meetingParticipants.listMeetingsForCurrentUser, {});
const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});
const conferencesQuery = convexQuery(api.conferences.list, {});

const calendarSearchSchema = z.object({
  view: z.enum(["week", "month"]).optional().default("week"),
  date: z.string().optional(),
});

export const Route = createFileRoute("/calendar")({
  validateSearch: calendarSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(myParticipationsQuery),
        queryClient.ensureQueryData(publicMeetingsQuery),
        queryClient.ensureQueryData(conferencesQuery),
      ]);
    }
  },
  component: CalendarPage,
});


function CalendarPage() {
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);
  const { data: conferences } = useSuspenseQuery(conferencesQuery);
  const conference = conferences?.[0];
  const allMeetings = useQuery(api.meetings.list, {});
  const allUsers = useQuery(api.users.listUsers, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const setShowPublicEventsMutation = useMutation(api.users.setShowPublicEvents);
  const navigate = useNavigate({ from: "/calendar" });
  const search = Route.useSearch();

  // URL params with defaults
  const view = search.view;
  const currentDate = search.date ? new Date(search.date) : new Date();
  // Show public events: default to true if user hasn't set a preference
  const showPublicEvents = currentUser?.showPublicEvents ?? true;

  // Get all meeting IDs for fetching participant data
  const myMeetingIds_all = useMemo(() => {
    return myParticipations.map((p) => p.meetingId);
  }, [myParticipations]);

  // Get meeting IDs where user is creator (for summaries)
  const creatorMeetingIds = useMemo(() => {
    return myParticipations.filter((p) => p.status === "creator").map((p) => p.meetingId);
  }, [myParticipations]);

  // Fetch participant summaries for meetings where user is creator
  const participantSummaries = useQuery(
    api.meetingParticipants.getParticipantSummaries,
    creatorMeetingIds.length > 0 ? { meetingIds: creatorMeetingIds } : "skip"
  );

  // Fetch participant userIds for all my meetings (to show other participant names)
  const participantUserIds = useQuery(
    api.meetingParticipants.getParticipantUserIds,
    myMeetingIds_all.length > 0 ? { meetingIds: myMeetingIds_all } : "skip"
  );

  // On mount, restore view/date from localStorage if URL params match defaults
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlView = new URLSearchParams(window.location.search).get("view");
      const urlDate = new URLSearchParams(window.location.search).get("date");

      const shouldRestore = !urlView && !urlDate;

      if (shouldRestore) {
        const savedView = localStorage.getItem("calendarView");
        const savedDate = localStorage.getItem("calendarDate");

        if (savedView || savedDate) {
          void navigate({
            search: {
              view: (savedView as "week" | "month") || "week",
              date: savedDate || undefined,
            },
            replace: true,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save view/date to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("calendarView", view);
      if (search.date) {
        localStorage.setItem("calendarDate", search.date);
      }
    }
  }, [view, search.date]);

  // Helper to update URL params
  const updateSearch = (updates: Partial<typeof search>) => {
    void navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeetingView | null>(null);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);

  const createMeeting = useMutation(api.meetings.create);
  const removeMeeting = useMutation(api.meetings.remove);

  const handleCreateBusy = async (scheduledTime: number, durationMinutes: number) => {
    if (!conference) return;
    await createMeeting({
      conferenceId: conference._id,
      title: "",
      description: "",
      scheduledTime,
      duration: durationMinutes,
      location: "",
      isPublic: false,
      maxParticipants: 1,
      addCurrentUserAs: "creator",
    });
  };

  const handleDeleteBusy = async (meetingId: Id<"meetings">) => {
    await removeMeeting({ meetingId });
  };

  const setView = (newView: "week" | "month") => updateSearch({ view: newView });
  const setCurrentDate = (date: Date) => updateSearch({ date: date.toISOString().split('T')[0] });
  const toggleShowPublic = () => {
    void setShowPublicEventsMutation({ showPublicEvents: !showPublicEvents });
  };

  // Build lookup maps
  const meetingsMap = useMemo(() => {
    if (!allMeetings) return new Map<Id<"meetings">, Doc<"meetings">>();
    return new Map(allMeetings.map((m) => [m._id, m]));
  }, [allMeetings]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<Id<"users">, Doc<"users">>();
    return new Map(allUsers.map((u) => [u._id, u]));
  }, [allUsers]);

  // Get IDs of meetings the user is in (any status)
  const myMeetingIds = useMemo(() => {
    return new Set(myParticipations.map((p) => p.meetingId));
  }, [myParticipations]);

  // Build my meetings with enrichment (includes all statuses: creator, accepted, pending, declined)
  const myMeetings = useMemo((): CalendarMeetingView[] => {
    const results: CalendarMeetingView[] = [];
    for (const p of myParticipations) {
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;

      // Get participant summary for this meeting (if available)
      const summary = participantSummaries?.[p.meetingId] as ParticipantSummary | undefined;

      results.push({
        meeting,
        userStatus: {
          participationStatus: p.status,
          isPendingRequest: p.status === "pending",
          isOutgoing: p.status === "creator" && !meeting.isPublic,
        },
        participantSummary: summary,
        display: {
          category: getMeetingDisplayCategory(meeting, p.status, summary),
        },
      });
    }
    return results;
  }, [myParticipations, meetingsMap, participantSummaries]);

  // Transform public meetings (only those user isn't already in)
  const publicMeetings = useMemo((): CalendarMeetingView[] => {
    return publicMeetingsData
      .filter((meeting) => !myMeetingIds.has(meeting._id))
      .map((meeting): CalendarMeetingView => ({
        meeting,
        userStatus: {
          participationStatus: undefined,
          isPendingRequest: false,
          isOutgoing: false,
        },
        display: {
          category: "public-available",
        },
      }));
  }, [publicMeetingsData, myMeetingIds]);

  // Determine which meetings to show
  let meetings: CalendarMeetingView[];
  if (showPublicEvents) {
    meetings = [...myMeetings, ...publicMeetings];
  } else {
    meetings = myMeetings;
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
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="not-prose h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-2">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {view === "week" && (
            <Button
              size="sm"
              variant={isEditingAvailability ? "default" : "outline"}
              onClick={() => setIsEditingAvailability(!isEditingAvailability)}
              className={isEditingAvailability ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              <CalendarClock className="w-4 h-4 mr-1" />
              {isEditingAvailability ? "Done" : "Edit Availability"}
            </Button>
          )}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={view === "week" ? "default" : "outline"}
              onClick={() => setView("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "default" : "outline"}
              onClick={() => setView("month")}
              disabled={isEditingAvailability}
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Subscription */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronDown className="w-4 h-4" />
          Sync to external calendar
        </summary>
        <div className="mt-3 p-4 bg-muted rounded-lg">
          <CalendarSubscription />
        </div>
      </details>

      {/* Calendar Grid */}
      {view === "week" ? (
        <WeekView
          meetings={meetings}
          currentDate={currentDate}
          usersMap={usersMap}
          participantUserIds={(participantUserIds ?? {}) as MeetingParticipantsMap}
          onMeetingClick={setSelectedMeeting}
          isEditingAvailability={isEditingAvailability}
          onCreateBusy={handleCreateBusy}
          onDeleteBusy={handleDeleteBusy}
        />
      ) : (
        <MonthView
          meetings={meetings}
          currentDate={currentDate}
          usersMap={usersMap}
          participantUserIds={(participantUserIds ?? {}) as MeetingParticipantsMap}
          onMeetingClick={setSelectedMeeting}
        />
      )}

      {/* Show public events toggle - below calendar */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-public"
            checked={showPublicEvents}
            onCheckedChange={toggleShowPublic}
          />
          <Label htmlFor="show-public" className="cursor-pointer">
            Show all public events
          </Label>
        </div>
      </div>

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        calendarMeeting={selectedMeeting}
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </div>
  );
}

function WeekView({
  meetings,
  currentDate,
  usersMap,
  participantUserIds,
  onMeetingClick,
  isEditingAvailability,
  onCreateBusy,
  onDeleteBusy,
}: {
  meetings: CalendarMeetingView[];
  currentDate: Date;
  usersMap: Map<Id<"users">, Doc<"users">>;
  participantUserIds: MeetingParticipantsMap;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
  isEditingAvailability: boolean;
  onCreateBusy: (scheduledTime: number, durationMinutes: number) => Promise<void>;
  onDeleteBusy: (meetingId: Id<"meetings">) => Promise<void>;
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
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="grid grid-cols-8 min-w-[800px]">
        {/* Time column header */}
        <div className="sticky top-0 bg-muted border-b border-border p-2 text-center text-sm font-semibold z-10"></div>

        {/* Day headers */}
        {weekDays.map((date, i) => {
          const isToday =
            date.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={`sticky top-0 bg-muted border-b border-l border-border p-2 text-center text-sm z-10 ${
                isToday ? "text-primary font-bold" : ""
              }`}
            >
              <div>
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`text-2xl ${isToday ? "bg-primary text-primary-foreground rounded-full w-8 h-8 mx-auto flex items-center justify-center" : ""}`}
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
              className="bg-background border-b border-border p-2 text-xs text-right text-muted-foreground sticky left-0"
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

              const hasBusyEventInHalfHour = (isBottomHalf: boolean) => {
                const halfStart = new Date(slotStart);
                if (isBottomHalf) halfStart.setMinutes(30);
                const halfEnd = new Date(halfStart.getTime() + 30 * 60000);

                return slotMeetings.some((m) => {
                  if (m.display.category !== "busy") return false;
                  const meetingStart = m.meeting.scheduledTime;
                  const meetingEnd = meetingStart + m.meeting.duration * 60000;
                  return meetingStart < halfEnd.getTime() && meetingEnd > halfStart.getTime();
                });
              };

              const handleHalfHourClick = (isBottomHalf: boolean) => {
                if (isEditingAvailability && !hasBusyEventInHalfHour(isBottomHalf)) {
                  const slotTime = new Date(slotStart);
                  if (isBottomHalf) {
                    slotTime.setMinutes(30);
                  }
                  void onCreateBusy(slotTime.getTime(), 30);
                }
              };

              return (
                <div
                  key={`${hour}-${dayIndex}`}
                  className="border-b border-l border-border min-h-[60px] relative"
                >
                  {/* Top half-hour */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1/2 ${
                      isEditingAvailability
                        ? "cursor-pointer hover:bg-destructive/10 transition-colors"
                        : ""
                    }`}
                    onClick={() => handleHalfHourClick(false)}
                  />
                  {/* Bottom half-hour */}
                  <div
                    className={`absolute inset-x-0 bottom-0 h-1/2 border-t border-border/40 ${
                      isEditingAvailability
                        ? "cursor-pointer hover:bg-destructive/10 transition-colors"
                        : ""
                    }`}
                    onClick={() => handleHalfHourClick(true)}
                  />
                  {slotMeetings.map((calendarMeeting) => {
                    const meetingStart = new Date(calendarMeeting.meeting.scheduledTime);
                    const isFirstSlot = meetingStart.getHours() === hour;

                    if (!isFirstSlot) return null;

                    const isBusy = calendarMeeting.display.category === "busy";
                    const startsAtHalfHour = meetingStart.getMinutes() >= 30;
                    const durationMinutes = calendarMeeting.meeting.duration;
                    const heightPercent = Math.min((durationMinutes / 60) * 100, 100);
                    const isNonBusyInEditMode = isEditingAvailability && !isBusy;

                    const handleCardClick = () => {
                      if (isEditingAvailability && isBusy) {
                        void onDeleteBusy(calendarMeeting.meeting._id);
                      } else if (!isEditingAvailability) {
                        onMeetingClick(calendarMeeting);
                      }
                    };

                    return (
                      <div
                        key={calendarMeeting.meeting._id}
                        className={`absolute left-1 right-1 ${isNonBusyInEditMode ? "pointer-events-none" : ""}`}
                        style={{
                          top: startsAtHalfHour ? "50%" : "4px",
                          height: `calc(${heightPercent}% - 8px)`,
                        }}
                      >
                        <CalendarGridCard
                          calendarMeeting={calendarMeeting}
                          usersMap={usersMap}
                          participantUserIds={participantUserIds}
                          onClick={handleCardClick}
                          dimmed={isNonBusyInEditMode}
                          isEditingAvailability={isEditingAvailability}
                        />
                      </div>
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
  usersMap,
  participantUserIds,
  onMeetingClick,
}: {
  meetings: CalendarMeetingView[];
  currentDate: Date;
  usersMap: Map<Id<"users">, Doc<"users">>;
  participantUserIds: MeetingParticipantsMap;
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
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="grid grid-cols-7 h-full">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="sticky top-0 bg-muted border-b border-r border-border p-2 text-center text-sm font-semibold z-10"
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
                className="border-r border-b border-border bg-muted/30 min-h-[100px]"
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
              className="border-r border-b border-border p-2 min-h-[100px] hover:bg-muted/50 transition-colors"
            >
              <div
                className={`text-sm mb-1 ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-bold" : ""}`}
              >
                {day}
              </div>
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((calendarMeeting) => {
                  const styles = categoryStyles[calendarMeeting.display.category];
                  const displayTitle = calendarMeeting.display.category === "busy"
                    ? "Busy"
                    : getDisplayTitle(calendarMeeting, usersMap, participantUserIds);
                  const tooltip = getEventTooltip(
                    calendarMeeting,
                    usersMap.get(calendarMeeting.meeting.creatorId)?.name
                  );

                  return (
                    <div
                      key={calendarMeeting.meeting._id}
                      className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity border-l-4 ${styles.border} ${styles.borderOnly ? "bg-background" : styles.bg} ${styles.text} ${styles.strikethrough ? "line-through" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeetingClick(calendarMeeting);
                      }}
                      title={tooltip}
                    >
                      {styles.warningIcon && "⚠️ "}
                      {new Date(calendarMeeting.meeting.scheduledTime).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}{" "}
                      {displayTitle}
                    </div>
                  );
                })}
                {dayMeetings.length > 3 && (
                  <div className="text-xs text-muted-foreground">
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

/**
 * Get the display title for a calendar event.
 * Uses event title if available, otherwise shows participant names.
 */
function getDisplayTitle(
  calendarMeeting: CalendarMeetingView,
  usersMap: Map<Id<"users">, Doc<"users">>,
  participantUserIds: MeetingParticipantsMap
): string {
  const { meeting } = calendarMeeting;

  // If meeting has a meaningful title (not auto-generated), use it
  if (meeting.title && !meeting.title.startsWith("Meeting Request")) {
    return meeting.title;
  }

  // For meetings without a meaningful title, show the other person's name
  const otherParticipantIds = participantUserIds[meeting._id] ?? [];
  if (otherParticipantIds.length > 0) {
    const names = otherParticipantIds
      .map((id) => usersMap.get(id)?.name)
      .filter(Boolean);
    if (names.length > 0) {
      return names.length <= 2 ? names.join(" & ") : `${names[0]} +${names.length - 1}`;
    }
  }

  // Fallback: show creator's name if user is invitee
  if (calendarMeeting.userStatus.participationStatus !== "creator") {
    const creatorName = usersMap.get(meeting.creatorId)?.name;
    if (creatorName) return creatorName;
  }

  return meeting.title || "Meeting";
}

function CalendarGridCard({
  calendarMeeting,
  usersMap,
  participantUserIds,
  onClick,
  dimmed = false,
  isEditingAvailability = false,
}: {
  calendarMeeting: CalendarMeetingView;
  usersMap: Map<Id<"users">, Doc<"users">>;
  participantUserIds: MeetingParticipantsMap;
  onClick: () => void;
  dimmed?: boolean;
  isEditingAvailability?: boolean;
}) {
  const { meeting, display } = calendarMeeting;
  const startTime = new Date(meeting.scheduledTime);
  const endTime = new Date(meeting.scheduledTime + meeting.duration * 60000);
  const styles = categoryStyles[display.category];
  const isBusy = display.category === "busy";
  const displayTitle = isBusy ? "Busy" : getDisplayTitle(calendarMeeting, usersMap, participantUserIds);
  const tooltip = getEventTooltip(
    calendarMeeting,
    usersMap.get(meeting.creatorId)?.name,
    isEditingAvailability
  );

  const isEditableBusy = isBusy && isEditingAvailability;

  const cardContent = (
    <div
      className={`border-l-4 ${styles.border} p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity h-full overflow-hidden ${styles.borderOnly ? "bg-background" : styles.bg} ${dimmed ? "opacity-40" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={isEditableBusy ? undefined : tooltip}
    >
      {isBusy ? (
        <div className={`font-semibold ${styles.text} truncate`}>
          {displayTitle}
        </div>
      ) : (
        <Link
          to="/meeting/$meetingId"
          params={{ meetingId: meeting._id }}
          className={`font-semibold ${styles.text} truncate block hover:underline ${styles.strikethrough ? "line-through" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {styles.warningIcon && "⚠️ "}
          {displayTitle}
        </Link>
      )}
      <div className="text-muted-foreground">
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
    </div>
  );

  if (isEditableBusy) {
    return (
      <Tippy content={tooltip} delay={0}>
        {cardContent}
      </Tippy>
    );
  }

  return cardContent;
}

function MeetingDetailModal({
  calendarMeeting,
  open,
  onClose,
}: {
  calendarMeeting: CalendarMeetingView | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!calendarMeeting) return null;

  const { meeting, userStatus } = calendarMeeting;
  const status = userStatus.participationStatus ?? null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0">
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
          <Button className="w-full" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
