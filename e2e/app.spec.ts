import { expect, test } from "@playwright/test";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { fileURLToPath } from "url";
import { api } from "../convex/_generated/api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Enable proxy support for Node.js fetch (required in sandbox environments)
// See ANTHROPIC_SANDBOX.md for details
// Docs: https://undici.nodejs.org/#/docs/api/ProxyAgent
const isProxyEnvironment = Boolean(process.env.https_proxy);
if (isProxyEnvironment) {
  setGlobalDispatcher(new ProxyAgent(process.env.https_proxy!));
}

// HTTP-based testing helper for proxy environments
// See ANTHROPIC_SANDBOX.md - WebSocket doesn't work through the sandbox proxy
// Based on: https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/testing.ts
// Using ConvexHttpClient instead of ConvexClient (which uses WebSocket)
// Docs: https://docs.convex.dev/api/classes/browser.ConvexHttpClient
class ConvexHttpTestingHelper {
  private client: ConvexHttpClient;

  constructor(backendUrl: string) {
    this.client = new ConvexHttpClient(backendUrl);
  }

  async query<Query extends FunctionReference<"query", "public">>(
    query: Query,
    args: FunctionArgs<Query>,
  ): Promise<Awaited<FunctionReturnType<Query>>> {
    return this.client.query(query, args);
  }

  async mutation<Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
  ): Promise<Awaited<FunctionReturnType<Mutation>>> {
    return this.client.mutation(mutation, args);
  }

  async close(): Promise<void> {
    // HTTP client doesn't need explicit close
  }
}

const SCREENSHOTS_DIR = path.resolve(__dirname, "../docs/screenshots");

function clearScreenshotsDir() {
  if (fs.existsSync(SCREENSHOTS_DIR)) {
    for (const file of fs.readdirSync(SCREENSHOTS_DIR)) {
      fs.unlinkSync(path.join(SCREENSHOTS_DIR, file));
    }
  }
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function screenshot(
  page: import("@playwright/test").Page,
  screenshotName: string,
) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${screenshotName}.png`),
    fullPage: false,
  });
}

const TEST_EMAIL = "e2e+clerk_test@example.com";
const TEST_USER_NAME = "E2E";
const CLERK_TEST_CODE = "424242";
const AUTH_TIMEOUT = 15000;
// Fixed timestamp for deterministic screenshots: 2025-01-15T10:00:00Z
const SEED_BASE_TIMESTAMP = 1736935200000;

// Generate unique test run ID for isolation
const TEST_RUN_ID = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

let convex: ConvexTestingHelper | ConvexHttpTestingHelper;

test.beforeAll(async () => {
  // Use HTTP client in proxy environments (WebSocket doesn't work through proxies)
  if (isProxyEnvironment) {
    convex = new ConvexHttpTestingHelper(process.env.VITE_CONVEX_URL!);
  } else {
    convex = new ConvexTestingHelper({
      backendUrl: process.env.VITE_CONVEX_URL!,
      // Use CONVEX_DEPLOY_KEY for cloud/preview deployments, otherwise use default local key
      ...(process.env.CONVEX_DEPLOY_KEY && {
        adminKey: process.env.CONVEX_DEPLOY_KEY,
      }),
    });
  }

  try {
    await convex.query(api.testingFunctions.verifyTestEnvironment, {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("IS_TEST")) {
      throw new Error(
        "\n\n" +
          "═══════════════════════════════════════════════════════════════\n" +
          "  E2E TEST SETUP ERROR\n" +
          "═══════════════════════════════════════════════════════════════\n" +
          "  IS_TEST environment variable is not set on your Convex deployment.\n\n" +
          "  To fix this:\n" +
          "  1. Go to your Convex dashboard\n" +
          "  2. Navigate to Settings > Environment Variables\n" +
          "  3. Add: IS_TEST = true\n" +
          "═══════════════════════════════════════════════════════════════\n",
      );
    }
    throw error;
  }
});

test.afterAll(async () => {
  try {
    // Clean up test user
    await convex.mutation(api.testingFunctions.deleteTestUser, {
      name: TEST_USER_NAME,
    });
    // Clean up isolated test data
    await convex.mutation(api.testingFunctions.cleanupTestRun, {
      testRunId: TEST_RUN_ID,
    });
  } catch {
    // Ignore cleanup errors
  }
  await convex.close();
});

async function signIn(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL);
  await page.getByRole("button", { name: "Continue" }).click();
  // Wait for Clerk to be ready to accept the verification code
  const codeInput = page.getByRole("textbox", { name: "Enter verification code" });
  await codeInput.waitFor({ state: "visible" });
  await page.waitForTimeout(500); // Give Clerk a moment to initialize
  await codeInput.pressSequentially(CLERK_TEST_CODE);
  await expect(
    page.getByRole("button", { name: "Open user menu" }),
  ).toBeVisible({ timeout: AUTH_TIMEOUT });
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible({ timeout: AUTH_TIMEOUT });
}

test.describe("E2E User Flow", () => {
  test("complete user journey with onboarding", async ({ page }) => {
    // Clear screenshots directory before generating new ones
    clearScreenshotsDir();

    // Freeze browser clock for deterministic calendar screenshots
    await page.clock.install({ time: new Date(SEED_BASE_TIMESTAMP) });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();

    await signIn(page);

    // New user should be redirected to profile with welcome message
    await expect(page.getByText("Welcome!")).toBeVisible({ timeout: AUTH_TIMEOUT });
    await screenshot(page, "profile-new-user");

    // Seed data now that the user is created - this creates other sample users to match against
    await convex.mutation(api.testingFunctions.seedWithFixedTimestamp, {
      baseTimestamp: SEED_BASE_TIMESTAMP,
      userName: TEST_USER_NAME,
      testRunId: TEST_RUN_ID,
    });
    // Wait for scheduled seed data to complete
    await page.waitForTimeout(2000);

    // Fill in profile fields and see live preview update
    await page.getByLabel("Company / Organization").fill("Effective Ventures");
    await page.getByLabel("Role / Title").fill("Operations Manager");
    await page
      .getByLabel("About You")
      .fill("Interested in high-impact careers and community building.");
    await page.getByLabel("Interests").fill("AI Safety, Career Planning");

    // Click a suggestion for "can help with"
    await page.getByRole("button", { name: "Community building" }).click();

    // Type in "needs help with"
    await page
      .getByLabel("How others can help me")
      .fill("product design and strategy");

    // Save the profile
    await page.getByRole("button", { name: "Save & Find Connections" }).click();

    // Should redirect to attendees page after save
    await expect(page.getByText("Alice Johnson").first()).toBeVisible({
      timeout: AUTH_TIMEOUT,
    });
    // Scroll to top for consistent screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, "attendees");

    // Verify profile is now filled by going back to profile page
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByLabel("Company / Organization")).toHaveValue(
      "Effective Ventures",
    );
    // Recommendations should now appear based on saved profile
    await expect(page.getByText("People You Might Want to Meet")).toBeVisible({
      timeout: 5000,
    });
    await screenshot(page, "profile-with-recommendations");

    // Browse other pages
    await page.goto("/agenda", { waitUntil: "networkidle" });
    await expect(page.getByText(/Incoming Requests/)).toBeVisible();
    await expect(page.getByText(/Sent Requests/)).toBeVisible();
    await expect(page.getByText(/Scheduled Meetings/)).toBeVisible();
    await expect(page.getByText("Incoming Requests (2)")).toBeVisible();
    await screenshot(page, "agenda");

    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    await expect(page.getByText(/Upcoming Meetings/)).toBeVisible();
    await expect(
      page.getByText("Opening Keynote: Future of Tech"),
    ).toBeVisible();
    await screenshot(page, "public-meetings");

    await page.goto("/calendar", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
    await screenshot(page, "calendar");

    // Test meeting detail page - use specific meeting for determinism
    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    // Click on "Opening Keynote" specifically (not .first() which may vary)
    await page
      .getByRole("heading", { name: "Opening Keynote: Future of Tech" })
      .locator("..")
      .getByRole("link", { name: "Open meeting page" })
      .click();
    await expect(
      page.getByRole("link", { name: "Back to Calendar" }),
    ).toBeVisible();
    await expect(page.getByText(/Participants/)).toBeVisible();
    await screenshot(page, "meeting-detail");

    // Test user profile page - click on the host (David Chen for Opening Keynote)
    await page.getByText("Hosted by:").locator("..").getByRole("link").click();
    await expect(
      page.getByRole("link", { name: "Back to Attendees" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "David Chen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request a Meeting" }),
    ).toBeVisible();
    await screenshot(page, "user-profile");

    // Clicking "Request a Meeting" navigates to attendees page with user pre-filled
    await page.getByRole("button", { name: "Request a Meeting" }).click();
    // The search should be pre-filled with the user's name
    await expect(page.getByRole("textbox")).toHaveValue("David Chen");

    await signOut(page);
  });

  test("chat feature", async ({ page }) => {
    await page.goto("/");
    await signIn(page);

    // Go to attendees and find someone to chat with
    await page.goto("/attendees", { waitUntil: "networkidle" });
    await expect(page.getByText("Alice Johnson").first()).toBeVisible();

    // Click the message icon on Alice's card
    await page
      .getByText("Alice Johnson")
      .first()
      .locator("../../../..")
      .getByRole("link", { name: "Message" })
      .click();

    // Should navigate to user profile with chat embed
    await expect(
      page.getByRole("heading", { name: "Alice Johnson" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible({
      timeout: 5000,
    });

    // Send a few messages
    const chatInput = page.getByPlaceholder("Type a message...");
    const sendButton = page.getByRole("button", { name: "Send message" });

    await chatInput.fill("Hi Alice! Great to meet you at the conference.");
    await sendButton.click();
    await expect(
      page.getByText("Hi Alice! Great to meet you at the conference."),
    ).toBeVisible();

    await chatInput.fill(
      "I saw you're interested in AI Safety - would love to chat about that!",
    );
    await sendButton.click();
    await expect(
      page.getByText("I saw you're interested in AI Safety"),
    ).toBeVisible();

    await chatInput.fill(
      "Let me know if you have time for a coffee break tomorrow.",
    );
    await sendButton.click();
    await expect(
      page.getByText(
        "Let me know if you have time for a coffee break tomorrow.",
      ),
    ).toBeVisible();

    await screenshot(page, "chat-embed-user-profile");

    // Navigate to chats page
    await page.goto("/chats", { waitUntil: "networkidle" });
    // There are two ChatRoomLists (mobile hidden, desktop visible) - get visible one
    const aliceChatLink = page
      .getByRole("link", { name: "Alice Johnson" })
      .first();
    await expect(aliceChatLink).toBeVisible();
    await screenshot(page, "chats-list");

    // Click into the chat to see split view (on desktop) or full chat (on mobile)
    await aliceChatLink.click();
    // Desktop layout renders both mobile (hidden via lg:hidden) and desktop (visible) chat views
    // Mobile view comes first in DOM, so we need to filter by visible to get the desktop one
    await expect(
      page
        .getByText("Hi Alice! Great to meet you at the conference.")
        .and(page.locator(":visible")),
    ).toBeVisible();
    await screenshot(page, "chat-conversation");

    await signOut(page);
  });
});
