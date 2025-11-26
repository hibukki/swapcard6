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

async function screenshot(
  page: import("@playwright/test").Page,
  screenshotName: string
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
  test("complete user journey with onboarding", async ({ page }) => {
    // Clear screenshots directory before generating new ones
    clearScreenshotsDir();

    // Freeze browser clock for deterministic calendar screenshots
    await page.clock.install({ time: new Date(SEED_BASE_TIMESTAMP) });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    await signIn(page);

    // New user should be redirected to profile with welcome message
    await expect(page.getByRole("heading", { name: "Complete Your Profile" })).toBeVisible({ timeout: AUTH_TIMEOUT });
    await expect(page.getByText("Welcome!")).toBeVisible();
    await screenshot(page, "profile-new-user");

    // Seed data now that the user is created - this creates other sample users to match against
    await convex.mutation(api.testingFunctions.seedWithFixedTimestamp, {
      baseTimestamp: SEED_BASE_TIMESTAMP,
      userName: TEST_USER_NAME,
    });
    // Wait for scheduled seed data to complete
    await page.waitForTimeout(2000);

    // Fill in profile fields and see live preview update
    await page.getByLabel("Company / Organization").fill("Effective Ventures");
    await page.getByLabel("Role / Title").fill("Operations Manager");
    await page.getByLabel("About You").fill("Interested in high-impact careers and community building.");
    await page.getByLabel("Interests").fill("AI Safety, Career Planning");

    // Click a suggestion for "can help with"
    await page.getByRole("button", { name: "Community building" }).click();

    // Type in "needs help with"
    await page.getByLabel("How others can help me").fill("product design and strategy");

    // Save the profile
    await page.getByRole("button", { name: "Save & Find Connections" }).click();

    // Should redirect to attendees page after save
    await expect(page.getByRole("heading", { name: "Attendees" })).toBeVisible({ timeout: AUTH_TIMEOUT });
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    // Scroll to top for consistent screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, "attendees");

    // Verify profile is now filled by going back to profile page
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Edit Your Profile" })).toBeVisible();
    await expect(page.getByLabel("Company / Organization")).toHaveValue("Effective Ventures");
    // Recommendations should now appear based on saved profile
    await expect(page.getByText("People You Might Want to Meet")).toBeVisible({ timeout: 5000 });
    await screenshot(page, "profile-with-recommendations");

    // Browse other pages
    await page.goto("/agenda", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "My Agenda" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Incoming Requests/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sent Requests/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Scheduled Meetings/ })).toBeVisible();
    await expect(page.getByText("Incoming Requests (2)")).toBeVisible();
    await screenshot(page, "agenda");

    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Public Meetings" })).toBeVisible();
    await expect(page.getByText("Upcoming Meetings")).toBeVisible();
    await expect(page.getByText("Opening Keynote: Future of Tech")).toBeVisible();
    await screenshot(page, "public-meetings");

    await page.goto("/calendar", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
    await screenshot(page, "calendar");

    // Test meeting detail page - use specific meeting for determinism
    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    // Click on "Opening Keynote" specifically (not .first() which may vary)
    await page.getByRole("heading", { name: "Opening Keynote: Future of Tech" })
      .locator("..").getByRole("link", { name: "Open meeting page" }).click();
    await expect(page.getByRole("link", { name: "Back to Calendar" })).toBeVisible();
    await expect(page.getByText(/Participants/)).toBeVisible();
    await screenshot(page, "meeting-detail");

    // Test user profile page - click on the host (David Chen for Opening Keynote)
    await page.getByText("Hosted by:").locator("..").getByRole("link").click();
    await expect(page.getByRole("link", { name: "Back to Attendees" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "David Chen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request a Meeting" })).toBeVisible();
    await screenshot(page, "user-profile");

    // Clicking "Request a Meeting" navigates to attendees page with user pre-filled
    await page.getByRole("button", { name: "Request a Meeting" }).click();
    await expect(page.getByRole("heading", { name: "Attendees" })).toBeVisible();
    // The search should be pre-filled with the user's name
    await expect(page.getByRole("textbox")).toHaveValue("David Chen");

    await signOut(page);
  });
});
