import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SharedMeetingsList } from "./SharedMeetingsList";
import { createMockMeeting } from "../test/mocks";
import type { Id } from "../../convex/_generated/dataModel";

describe("SharedMeetingsList", () => {
  it("renders nothing when meetings array is empty", () => {
    const { container } = render(<SharedMeetingsList meetings={[]} />);
    expect(container).toMatchSnapshot();
  });

  it("renders single meeting", () => {
    const meetings = [
      createMockMeeting({
        _id: "meeting_1" as Id<"meetings">,
        title: "Coffee Chat",
        scheduledTime: new Date("2025-01-15T10:00:00Z").getTime(),
        duration: 30,
      }),
    ];
    const { container } = render(<SharedMeetingsList meetings={meetings} />);
    expect(container).toMatchSnapshot();
  });

  it("renders multiple meetings", () => {
    const meetings = [
      createMockMeeting({
        _id: "meeting_1" as Id<"meetings">,
        title: "Morning Standup",
        scheduledTime: new Date("2025-01-15T09:00:00Z").getTime(),
        duration: 15,
      }),
      createMockMeeting({
        _id: "meeting_2" as Id<"meetings">,
        title: "Lunch Discussion",
        scheduledTime: new Date("2025-01-15T12:00:00Z").getTime(),
        duration: 60,
        location: "Cafeteria",
      }),
      createMockMeeting({
        _id: "meeting_3" as Id<"meetings">,
        title: "Afternoon Review",
        scheduledTime: new Date("2025-01-15T15:30:00Z").getTime(),
        duration: 45,
        location: "Conference Room B",
      }),
    ];
    const { container } = render(<SharedMeetingsList meetings={meetings} />);
    expect(container).toMatchSnapshot();
  });

  it("renders meeting with location", () => {
    const meetings = [
      createMockMeeting({
        title: "Office Hours",
        location: "Room 101",
        scheduledTime: new Date("2025-01-15T14:00:00Z").getTime(),
      }),
    ];
    const { container } = render(<SharedMeetingsList meetings={meetings} />);
    expect(container).toMatchSnapshot();
  });

  it("renders with click handler", () => {
    const meetings = [createMockMeeting({ title: "Clickable Meeting" })];
    const handleClick = vi.fn();
    const { container } = render(
      <SharedMeetingsList meetings={meetings} onMeetingClick={handleClick} />
    );
    expect(container).toMatchSnapshot();
  });
});
