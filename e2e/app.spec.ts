import { expect, test } from "@playwright/test";
import { ConvexTestingHelper } from "convex-helpers/testing";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { api } from "../convex/_generated/api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SCREENSHOTS_DIR = path.resolve(__dirname, "../docs/screenshots");

function clearScreenshotsDir() {
  if (fs.existsSync(SCREENSHOTS_DIR)) {
    for (const file of fs.readdirSync(SCREENSHOTS_DIR)) {
      fs.unlinkSync(path.join(SCREENSHOTS_DIR, file));
    }
  }
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function navigateAndScreenshot(
  page: import("@playwright/test").Page,
  url: string,
  screenshotName: string
) {
  await page.goto(url, { waitUntil: "networkidle" });
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

let convex: ConvexTestingHelper;

test.beforeAll(async () => {
  convex = new ConvexTestingHelper({
    backendUrl: process.env.VITE_CONVEX_URL!,
  });

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
        "═══════════════════════════════════════════════════════════════\n"
      );
    }
    throw error;
  }
});

test.afterAll(async () => {
  try {
    await convex.mutation(api.testingFunctions.deleteTestUser, { name: TEST_USER_NAME });
  } catch {
    // Ignore cleanup errors
  }
  await convex.close();
});

async function signIn(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(TEST_EMAIL);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Enter verification code" }).pressSequentially(CLERK_TEST_CODE);
  await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible({ timeout: AUTH_TIMEOUT });
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible({ timeout: AUTH_TIMEOUT });
}

test.describe("E2E User Flow", () => {
  test("complete user journey", async ({ page }) => {
    // Clear screenshots directory before generating new ones
    clearScreenshotsDir();

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    await signIn(page);

    await page.goto("/agenda", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "My Agenda" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Incoming Requests/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sent Requests/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Scheduled Meetings/ })).toBeVisible();

    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Public Meetings" })).toBeVisible();
    await expect(page.getByText("Upcoming Meetings")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Public Meeting/i })).toBeVisible();

    await page.goto("/attendees", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Attendees" })).toBeVisible();

    await page.goto("/calendar", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Edit Your Profile" })).toBeVisible();
    await expect(page.getByText("Company")).toBeVisible();
    await expect(page.getByText("Role")).toBeVisible();
    await expect(page.getByText("Bio")).toBeVisible();
    await expect(page.getByText("Developer Tools")).toBeVisible();
    await expect(page.getByRole("button", { name: "Seed Test Data" })).toBeVisible();

    // Seed via testing API with fixed timestamp for deterministic screenshots
    await convex.mutation(api.testingFunctions.seedWithFixedTimestamp, {
      baseTimestamp: SEED_BASE_TIMESTAMP,
      userName: TEST_USER_NAME,
    });
    // Wait for scheduled seed data to complete
    await page.waitForTimeout(2000);

    // Take screenshots of main pages with seeded data
    await navigateAndScreenshot(page, "/agenda", "agenda");
    await expect(page.getByText("Incoming Requests (2)")).toBeVisible();

    await navigateAndScreenshot(page, "/public-meetings", "public-meetings");
    await expect(page.getByText("Opening Keynote: Future of Tech")).toBeVisible();

    await navigateAndScreenshot(page, "/attendees", "attendees");
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    await expect(page.getByText("Bob Smith")).toBeVisible();

    await navigateAndScreenshot(page, "/calendar", "calendar");

    // Test meeting detail page (MeetingCard with ParticipantList)
    await navigateAndScreenshot(page, "/public-meetings", "public-meetings");
    // Click the "Open meeting page" link on the first meeting card
    await page.getByRole("link", { name: "Open meeting page" }).first().click();
    // Should be on a meeting detail page showing MeetingCard in full mode
    await expect(page.getByRole("link", { name: "Back to Calendar" })).toBeVisible();
    await expect(page.getByText(/Participants/)).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "meeting-detail.png") });

    // Test user profile page via host link (UserProfileCard component)
    await page.getByText("Hosted by:").locator("..").getByRole("link").click();
    // Should show the UserProfileCard with basic profile info
    await expect(page.getByRole("link", { name: "Back to Attendees" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request a Meeting" })).toBeVisible();
    // Verify it's a user profile page by checking for profile elements
    await expect(page.locator("text=/Interests:/")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "user-profile.png") });
    await page.getByRole("link", { name: "Back to Attendees" }).click();
    await expect(page.getByRole("heading", { name: "Attendees" })).toBeVisible();

    await signOut(page);
  });
});
