import type { Doc, Id } from "../../convex/_generated/dataModel";

// Factory functions for test data
export function createMockUser(overrides: Partial<Doc<"users">> = {}): Doc<"users"> {
  return {
    _id: "user_123" as Id<"users">,
    _creationTime: Date.now(),
    clerkId: "clerk_123",
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  };
}

// Fixed timestamp for deterministic snapshots: 2025-01-15T10:00:00Z
const FIXED_TIMESTAMP = 1736935200000;

export function createMockMeeting(overrides: Partial<Doc<"meetings">> = {}): Doc<"meetings"> {
  return {
    _id: "meeting_123" as Id<"meetings">,
    _creationTime: FIXED_TIMESTAMP,
    title: "Test Meeting",
    scheduledTime: FIXED_TIMESTAMP + 86400000, // Day after fixed date
    duration: 30,
    creatorId: "user_123" as Id<"users">,
    conferenceId: "conference_123" as Id<"conferences">,
    isPublic: false,
    ...overrides,
  };
}

export function createMockParticipant(overrides: Partial<Doc<"meetingParticipants">> = {}): Doc<"meetingParticipants"> {
  return {
    _id: "participant_123" as Id<"meetingParticipants">,
    _creationTime: Date.now(),
    meetingId: "meeting_123" as Id<"meetings">,
    userId: "user_123" as Id<"users">,
    status: "accepted",
    ...overrides,
  };
}
