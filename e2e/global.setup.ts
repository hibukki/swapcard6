import { clerkSetup } from "@clerk/testing/playwright";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

export default async function globalSetup() {
  await clerkSetup();
}
