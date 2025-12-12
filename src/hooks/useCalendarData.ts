import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
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

export const myParticipationsQuery = convexQuery(api.meetingParticipants.listMeetingsForCurrentUser, {});
export const publicMeetingsQuery = convexQuery(api.meetings.listPublic, {});

export interface UseCalendarDataResult {
  meetings: CalendarMeetingView[];
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  showPublicEvents: boolean;
  toggleShowPublic: () => void;
  createBusy: (scheduledTime: number, durationMinutes: number) => Promise<void>;
  deleteBusy: (meetingId: string) => Promise<void>;
  isLoading: boolean;
}

export function useCalendarData(): UseCalendarDataResult {
  const { data: myParticipations } = useSuspenseQuery(myParticipationsQuery);
  const { data: publicMeetingsData } = useSuspenseQuery(publicMeetingsQuery);
  const allMeetings = useQuery(api.meetings.list, {});
  const allUsers = useQuery(api.users.listUsers, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const setShowPublicEventsMutation = useMutation(api.users.setShowPublicEvents);
  const createMeetingMutation = useMutation(api.meetings.create);
  const removeMeetingMutation = useMutation(api.meetings.remove);

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

  const toggleShowPublic = () => {
    void setShowPublicEventsMutation({ showPublicEvents: !showPublicEvents });
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

  const deleteBusy = async (meetingId: string) => {
    await removeMeetingMutation({ meetingId: meetingId as Id<"meetings"> });
  };

  return {
    meetings,
    usersMap,
    participantUserIds,
    showPublicEvents,
    toggleShowPublic,
    createBusy,
    deleteBusy,
    isLoading: !allMeetings || !allUsers,
  };
}
