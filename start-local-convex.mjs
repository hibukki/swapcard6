#!/usr/bin/env node

import { spawn } from "child_process";
import { renameSync, existsSync } from "fs";

console.log("[Starting convex dev...]");

// Temporarily move .env.local to prevent Convex from reading CONVEX_DEPLOYMENT
const envLocalPath = ".env.local";
const envLocalBackup = ".env.local.backup";
let envLocalMoved = false;

if (existsSync(envLocalPath)) {
  renameSync(envLocalPath, envLocalBackup);
  envLocalMoved = true;
  console.log("[Temporarily moved .env.local]");
}

// List of prompts to auto-answer with Enter
const prompts = [
  "Device name:",
  "Would you like to login to your account?",
  "Which project would you like to use?",
  "Choose a name:",
];

let buffer = "";

// Use 'script' command to create a pseudo-TTY so convex CLI thinks it's interactive
// Unset CONVEX_DEPLOYMENT to run a truly local backend without authentication
const env = { ...process.env };
delete env.CONVEX_DEPLOYMENT;

const childProcess = spawn(
  "script",
  [
    "-q", // quiet mode
    "-c",
    "pnpx convex dev",
    "/dev/null",
  ],
  {
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    env,
  },
);

let setupTimeout = null;

const resetTimeout = () => {
  if (setupTimeout) clearTimeout(setupTimeout);
  setupTimeout = setTimeout(() => {
    console.log("\n[Setup complete, running dev server...]");
    // Stop checking for prompts, just forward everything
    childProcess.stdout.removeAllListeners("data");
    childProcess.stderr.removeAllListeners("data");
    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
  }, 3000);
};

childProcess.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text);

  buffer += text;

  // Check if any prompt matches
  for (const prompt of prompts) {
    if (buffer.includes(prompt)) {
      console.log(`\n[Matched '${prompt}' - sending Enter]`);
      childProcess.stdin.write("\n");
      buffer = ""; // Clear buffer after match
      resetTimeout();
      break;
    }
  }

  // Keep buffer from growing too large
  if (buffer.length > 1000) {
    buffer = buffer.slice(-500);
  }
});

childProcess.stderr.on("data", (data) => {
  process.stderr.write(data);
});

const restoreEnvLocal = () => {
  if (envLocalMoved && existsSync(envLocalBackup)) {
    renameSync(envLocalBackup, envLocalPath);
    console.log("\n[Restored .env.local]");
  }
};

childProcess.on("exit", (code) => {
  if (setupTimeout) clearTimeout(setupTimeout);
  restoreEnvLocal();
  process.exit(code);
});

// Start timeout
resetTimeout();

// Handle Ctrl+C
process.on("SIGINT", () => {
  childProcess.kill("SIGINT");
  restoreEnvLocal();
});

process.on("SIGTERM", () => {
  childProcess.kill("SIGTERM");
  restoreEnvLocal();
});
