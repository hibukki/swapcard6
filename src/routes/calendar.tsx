import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import React, { useState } from "react";
import { z } from "zod";
import { CalendarSubscription } from "../components/CalendarSubscription";
import { MeetingCard as MeetingCardComponent } from "../components/MeetingCard";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { useCalendarData, preloadCalendarData } from "@/hooks/useCalendarData";
import type { CalendarMeetingView } from "@/types/calendar";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const calendarSearchSchema = z.object({
  view: z.enum(["week", "month"]).optional().default("week"),
  date: z.string().optional(),
});

export const Route = createFileRoute("/calendar")({
  validateSearch: calendarSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await preloadCalendarData(queryClient);
    }
  },
  component: CalendarPage,
});

function CalendarPage() {
  const {
    meetings,
    usersMap,
    participantUserIds,
    showPublicEvents,
    toggleShowPublic,
    createBusy,
    deleteBusy,
    isLoading,
  } = useCalendarData();

  const navigate = useNavigate({ from: "/calendar" });
  const search = Route.useSearch();

  const view = search.view;
  const currentDate = search.date ? new Date(search.date) : new Date();

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

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("calendarView", view);
      if (search.date) {
        localStorage.setItem("calendarDate", search.date);
      }
    }
  }, [view, search.date]);

  const updateSearch = (updates: Partial<typeof search>) => {
    void navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeetingView | null>(null);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);

  const setView = (newView: "week" | "month") => updateSearch({ view: newView });
  const setCurrentDate = (date: Date) => updateSearch({ date: date.toISOString().split('T')[0] });

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

  if (isLoading) {
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
          participantUserIds={participantUserIds}
          onMeetingClick={setSelectedMeeting}
          isEditingAvailability={isEditingAvailability}
          onCreateBusy={(time, duration) => void createBusy(time, duration)}
          onDeleteBusy={(id) => void deleteBusy(id as Id<"meetings">)}
        />
      ) : (
        <MonthView
          meetings={meetings}
          currentDate={currentDate}
          usersMap={usersMap}
          participantUserIds={participantUserIds}
          onMeetingClick={setSelectedMeeting}
        />
      )}

      {/* Show public events toggle */}
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
