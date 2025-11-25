import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  timeout: 60000,
  expect: {
    timeout: 1000,
  },
  use: {
    baseURL: "http://localhost:5173",
    actionTimeout: 1000,
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on",
  },
  retries: 1,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
