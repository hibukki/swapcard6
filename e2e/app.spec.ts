import { expect, test } from "@playwright/test";
import { ConvexTestingHelper } from "convex-helpers/testing";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { api } from "../convex/_generated/api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const TEST_EMAIL = "e2e+clerk_test@example.com";
const TEST_USER_NAME = "E2E";
const CLERK_TEST_CODE = "424242";
const AUTH_TIMEOUT = 15000;

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

    await page.getByRole("button", { name: "Seed Test Data" }).click();
    await expect(page.getByText("Test data created successfully!")).toBeVisible({ timeout: AUTH_TIMEOUT });

    await page.goto("/agenda", { waitUntil: "networkidle" });
    await expect(page.getByText("Incoming Requests (2)")).toBeVisible();

    await page.goto("/public-meetings", { waitUntil: "networkidle" });
    await expect(page.getByText("Opening Keynote: Future of Tech")).toBeVisible();

    await page.goto("/attendees", { waitUntil: "networkidle" });
    await expect(page.getByText("Alice Johnson")).toBeVisible();
    await expect(page.getByText("Bob Smith")).toBeVisible();

    await signOut(page);
  });
});
