import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import type { Id, Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CreatePublicMeetingModal } from "@/components/CreatePublicMeetingModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeetingCard } from "@/components/MeetingCard";
import { EmptyState } from "@/components/patterns/EmptyState";

const searchParamsSchema = z.object({
  date: z.string().optional(),
});

const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});
const myParticipationsQuery = convexQuery(
  api.meetingParticipants.listMeetingsForCurrentUser,
  {}
);

export const Route = createFileRoute("/grid")({
  validateSearch: searchParamsSchema,
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(publicMeetingsQuery),
        queryClient.ensureQueryData(myParticipationsQuery),
      ]);
    }
  },
  component: GridPage,
});

function GridPage() {
  const { date } = Route.useSearch();
  const navigate = useNavigate();

  const currentDate = date ? new Date(date) : new Date();
  currentDate.setHours(0, 0, 0, 0);

  const { data: meetings } = useSuspenseQuery(publicMeetingsQuery);
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);

  const conferences = useQuery(api.conferences.list);
  const conference = conferences?.[0];

  const meetingSpots = useQuery(
    api.conferenceMeetingSpots.listByConference,
    conference?._id ? { conferenceId: conference._id } : "skip"
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDefaults, setCreateModalDefaults] = useState<{
    location: string;
    scheduledTime: Date;
  } | null>(null);

  const [selectedMeeting, setSelectedMeeting] = useState<Doc<"meetings"> | null>(
    null
  );

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

  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const goToDate = (d: Date) => {
    void navigate({
      to: "/grid",
      search: { date: d.toISOString().split("T")[0] },
    });
  };

  const goToPreviousDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    goToDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    goToDate(next);
  };

  const goToToday = () => {
    void navigate({ to: "/grid", search: {} });
  };

  const getMeetingsForLocationAndHour = (location: string, hour: number) => {
    const slotStart = new Date(currentDate);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(currentDate);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return meetings.filter((meeting) => {
      if (meeting.location !== location) return false;
      const meetingStart = new Date(meeting.scheduledTime);
      const meetingEnd = new Date(
        meeting.scheduledTime + meeting.duration * 60000
      );
      return meetingStart < slotEnd && meetingEnd > slotStart;
    });
  };

  const handleCellClick = (location: string, hour: number) => {
    const scheduledTime = new Date(currentDate);
    scheduledTime.setHours(hour, 0, 0, 0);
    setCreateModalDefaults({ location, scheduledTime });
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setCreateModalDefaults(null);
  };

  const spots = meetingSpots ?? [];

  if (spots.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Grid View</h1>
        <EmptyState
          title="No locations configured"
          description="Add meeting spots in Config to use the grid view"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4 not-prose">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="font-semibold ml-2">{formatDate(currentDate)}</span>
        </div>
      </div>

      <div className="not-prose overflow-auto border border-border rounded-lg">
        <div
          className="grid min-w-[800px]"
          style={{
            gridTemplateColumns: `80px repeat(${spots.length}, minmax(150px, 1fr))`,
          }}
        >
          <div className="sticky top-0 left-0 z-20 bg-muted border-b border-r border-border p-2"></div>
          {spots.map((spot) => (
            <div
              key={spot._id}
              className="sticky top-0 bg-muted border-b border-r border-border p-2 text-center text-sm font-semibold z-10"
            >
              {spot.name}
            </div>
          ))}

          {hours.map((hour) => (
            <>
              <div
                key={`time-${hour}`}
                className="bg-background border-b border-r border-border p-2 text-xs text-right text-muted-foreground sticky left-0 z-10"
              >
                {hour === 0 || hour === 12 ? "12" : hour > 12 ? hour - 12 : hour}
                {hour < 12 ? " AM" : " PM"}
              </div>

              {spots.map((spot) => {
                const slotMeetings = getMeetingsForLocationAndHour(
                  spot.name,
                  hour
                );

                return (
                  <div
                    key={`${hour}-${spot._id}`}
                    className="border-b border-r border-border min-h-[60px] relative cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleCellClick(spot.name, hour)}
                  >
                    {slotMeetings.map((meeting) => {
                      const meetingStart = new Date(meeting.scheduledTime);
                      const isFirstSlot = meetingStart.getHours() === hour;

                      if (!isFirstSlot) return null;

                      const startsAtHalfHour = meetingStart.getMinutes() >= 30;
                      const durationMinutes = meeting.duration;
                      const heightPercent = Math.min(
                        (durationMinutes / 60) * 100,
                        100
                      );

                      return (
                        <div
                          key={meeting._id}
                          className="absolute left-1 right-1 z-10"
                          style={{
                            top: startsAtHalfHour ? "50%" : "4px",
                            height: `calc(${heightPercent}% - 8px)`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeeting(meeting);
                          }}
                        >
                          <div className="h-full bg-primary/20 border border-primary/30 rounded p-1 overflow-hidden cursor-pointer hover:bg-primary/30 transition-colors">
                            <div className="text-xs font-medium truncate">
                              {meeting.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {meetingStart.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <CreatePublicMeetingModal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        defaultLocation={createModalDefaults?.location}
        defaultScheduledTime={createModalDefaults?.scheduledTime}
        defaultDuration={60}
      />

      <Dialog
        open={selectedMeeting !== null}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <MeetingCard
              meeting={selectedMeeting}
              userStatus={statusByMeetingId.get(selectedMeeting._id)}
              variant="full"
              showMeetingLink
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
