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

export function createMockMeeting(overrides: Partial<Doc<"meetings">> = {}): Doc<"meetings"> {
  return {
    _id: "meeting_123" as Id<"meetings">,
    _creationTime: Date.now(),
    title: "Test Meeting",
    scheduledTime: Date.now() + 86400000, // Tomorrow
    duration: 30,
    creatorId: "user_123" as Id<"users">,
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
