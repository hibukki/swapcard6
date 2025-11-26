import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { UserProfileCard } from "./UserProfileCard";
import { createMockUser } from "../test/mocks";

describe("UserProfileCard", () => {
  it("renders minimal user", () => {
    const user = createMockUser();
    const { container } = render(<UserProfileCard user={user} />);
    expect(container).toMatchSnapshot();
  });

  it("renders user with all fields", () => {
    const user = createMockUser({
      name: "Jane Doe",
      email: "jane@example.com",
      bio: "Software engineer passionate about open source",
      company: "Acme Corp",
      role: "Senior Developer",
      interests: ["TypeScript", "React", "Convex"],
      canHelpWith: "Code reviews, architecture discussions",
      needsHelpWith: "Mobile development, DevOps",
      imageUrl: "https://example.com/avatar.jpg",
    });
    const { container } = render(<UserProfileCard user={user} />);
    expect(container).toMatchSnapshot();
  });

  it("renders with request meeting button when callback provided", () => {
    const user = createMockUser({ name: "Bob Smith" });
    const handleClick = vi.fn();
    const { container } = render(
      <UserProfileCard user={user} onRequestMeeting={handleClick} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders avatar placeholder when no image", () => {
    const user = createMockUser({ name: "Alice", imageUrl: undefined });
    const { container } = render(<UserProfileCard user={user} />);
    expect(container).toMatchSnapshot();
  });
});
