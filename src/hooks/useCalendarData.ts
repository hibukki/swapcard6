import { convexQuery } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  type ParticipantSummary,
  getMeetingDisplayCategory,
  toCalendarUsersMap,
  toCalendarParticipantsMap,
} from "@/types/calendar";

const myParticipationsQuery = convexQuery(api.meetingParticipants.listMeetingsForCurrentUser, {});
const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});

export async function preloadCalendarData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.ensureQueryData(myParticipationsQuery),
    queryClient.ensureQueryData(publicMeetingsQuery),
  ]);
}

export interface UseCalendarDataResult {
  meetings: CalendarMeetingView[];
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  showPublicEvents: boolean;
  toggleShowPublic: () => Promise<void>;
  createBusy: (scheduledTime: number, durationMinutes: number) => Promise<void>;
  deleteBusy: (meetingId: Id<"meetings">) => Promise<void>;
  isLoading: boolean;
}

export function useCalendarData(): UseCalendarDataResult {
  const mountTime = useRef(performance.now());
  const timingsLogged = useRef<Set<string>>(new Set());

  const logTiming = (name: string, hasData: boolean) => {
    if (hasData && !timingsLogged.current.has(name)) {
      timingsLogged.current.add(name);
      const elapsed = (performance.now() - mountTime.current).toFixed(0);
      console.log(`[Calendar] ${name}: ${elapsed}ms`);
    }
  };

  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);
  const allMeetings = useQuery(api.meetings.list, {});
  const allUsers = useQuery(api.users.listUsers, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const setShowPublicEventsMutation = useMutation(api.users.setShowPublicEvents);
  const createMeetingMutation = useMutation(api.meetings.create);
  const removeMeetingMutation = useMutation(api.meetings.remove);

  useEffect(() => {
    logTiming("myParticipations", myParticipations !== undefined);
  }, [myParticipations]);

  useEffect(() => {
    logTiming("publicMeetingsData", publicMeetingsData !== undefined);
  }, [publicMeetingsData]);

  useEffect(() => {
    logTiming("allMeetings", allMeetings !== undefined);
  }, [allMeetings]);

  useEffect(() => {
    logTiming("allUsers", allUsers !== undefined);
  }, [allUsers]);

  useEffect(() => {
    logTiming("currentUser", currentUser !== undefined);
  }, [currentUser]);

  const showPublicEvents = currentUser?.showPublicEvents ?? true;

  const myMeetingIds_all = useMemo(() => {
    return myParticipations.map((p) => p.meetingId);
  }, [myParticipations]);

  const creatorMeetingIds = useMemo(() => {
    return myParticipations.filter((p) => p.status === "creator").map((p) => p.meetingId);
  }, [myParticipations]);

  const participantSummaries = useQuery(
    api.meetingParticipants.getParticipantSummaries,
    creatorMeetingIds.length > 0 ? { meetingIds: creatorMeetingIds } : "skip"
  );

  const participantUserIdsRaw = useQuery(
    api.meetingParticipants.getParticipantUserIds,
    myMeetingIds_all.length > 0 ? { meetingIds: myMeetingIds_all } : "skip"
  );

  useEffect(() => {
    logTiming("participantSummaries", participantSummaries !== undefined);
  }, [participantSummaries]);

  useEffect(() => {
    logTiming("participantUserIds", participantUserIdsRaw !== undefined);
  }, [participantUserIdsRaw]);

  const isLoading = !allMeetings || !allUsers || currentUser === undefined;

  useEffect(() => {
    logTiming("isLoading=false (ready)", !isLoading);
  }, [isLoading]);

  const meetingsMap = useMemo(() => {
    if (!allMeetings) return new Map();
    return new Map(allMeetings.map((m) => [m._id, m]));
  }, [allMeetings]);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<string, CalendarUser>();
    return toCalendarUsersMap(allUsers);
  }, [allUsers]);

  const participantUserIds = useMemo(() => {
    if (!participantUserIdsRaw) return {} as CalendarParticipantsMap;
    return toCalendarParticipantsMap(participantUserIdsRaw);
  }, [participantUserIdsRaw]);

  const myMeetingIds = useMemo(() => {
    return new Set(myParticipations.map((p) => p.meetingId));
  }, [myParticipations]);

  const myMeetings = useMemo((): CalendarMeetingView[] => {
    const results: CalendarMeetingView[] = [];
    for (const p of myParticipations) {
      const meeting = meetingsMap.get(p.meetingId);
      if (!meeting) continue;

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

  const meetings = useMemo(() => {
    if (showPublicEvents) {
      return [...myMeetings, ...publicMeetings];
    }
    return myMeetings;
  }, [showPublicEvents, myMeetings, publicMeetings]);

  const toggleShowPublic = async () => {
    await setShowPublicEventsMutation({ showPublicEvents: !showPublicEvents });
  };

  const createBusy = async (scheduledTime: number, durationMinutes: number) => {
    await createMeetingMutation({
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

  const deleteBusy = async (meetingId: Id<"meetings">) => {
    await removeMeetingMutation({ meetingId });
  };

  return {
    meetings,
    usersMap,
    participantUserIds,
    showPublicEvents,
    toggleShowPublic,
    createBusy,
    deleteBusy,
    isLoading,
  };
}
