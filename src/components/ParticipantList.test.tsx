import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ParticipantList } from "./ParticipantList";
import { createMockUser } from "../test/mocks";
import type { Id, Doc } from "../../convex/_generated/dataModel";

function createUsersMap(users: Doc<"users">[]): Map<Id<"users">, Doc<"users">> {
  return new Map(users.map((u) => [u._id, u]));
}

describe("ParticipantList", () => {
  it("renders nothing when participants array is empty", () => {
    const { container } = render(
      <ParticipantList participants={[]} usersMap={new Map()} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders single participant", () => {
    const user = createMockUser({ _id: "user_1" as Id<"users">, name: "Alice" });
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: user._id, status: "accepted" as const },
    ];
    const { container } = render(
      <ParticipantList participants={participants} usersMap={createUsersMap([user])} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders multiple participants with different statuses", () => {
    const users = [
      createMockUser({ _id: "user_1" as Id<"users">, name: "Alice (Host)" }),
      createMockUser({ _id: "user_2" as Id<"users">, name: "Bob" }),
      createMockUser({ _id: "user_3" as Id<"users">, name: "Charlie" }),
      createMockUser({ _id: "user_4" as Id<"users">, name: "Diana" }),
    ];
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: users[0]._id, status: "creator" as const },
      { _id: "p2" as Id<"meetingParticipants">, userId: users[1]._id, status: "accepted" as const },
      { _id: "p3" as Id<"meetingParticipants">, userId: users[2]._id, status: "pending" as const },
      { _id: "p4" as Id<"meetingParticipants">, userId: users[3]._id, status: "declined" as const },
    ];
    const { container } = render(
      <ParticipantList participants={participants} usersMap={createUsersMap(users)} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders without header when showHeader is false", () => {
    const user = createMockUser({ _id: "user_1" as Id<"users">, name: "Alice" });
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: user._id, status: "accepted" as const },
    ];
    const { container } = render(
      <ParticipantList
        participants={participants}
        usersMap={createUsersMap([user])}
        showHeader={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders with custom maxHeight", () => {
    const user = createMockUser({ _id: "user_1" as Id<"users">, name: "Alice" });
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: user._id, status: "accepted" as const },
    ];
    const { container } = render(
      <ParticipantList
        participants={participants}
        usersMap={createUsersMap([user])}
        maxHeight="max-h-96"
      />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders with clickable user names when onUserClick provided", () => {
    const user = createMockUser({ _id: "user_1" as Id<"users">, name: "Alice" });
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: user._id, status: "accepted" as const },
    ];
    const handleClick = vi.fn();
    const { container } = render(
      <ParticipantList
        participants={participants}
        usersMap={createUsersMap([user])}
        onUserClick={handleClick}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders Unknown for missing user", () => {
    const participants = [
      { _id: "p1" as Id<"meetingParticipants">, userId: "missing_user" as Id<"users">, status: "accepted" as const },
    ];
    const { container } = render(
      <ParticipantList participants={participants} usersMap={new Map()} />
    );
    expect(container).toMatchSnapshot();
  });
});
