import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

setup.describe.configure({ mode: "serial" });

setup("global setup", async ({}) => {
  await clerkSetup();
});
