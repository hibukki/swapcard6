import { defineConfig, devices } from "@playwright/test";

// Configure proxy for browser (required in sandbox environments)
function parseProxyConfig() {
  const proxyUrl = process.env.https_proxy;
  if (!proxyUrl) return {};

  // Parse proxy URL format: http://username:password@host:port
  const match = proxyUrl.match(/^(https?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (match) {
    const [, protocol, username, password, hostPort] = match;
    return {
      proxy: {
        server: `${protocol}${hostPort}`,
        username: decodeURIComponent(username),
        password: decodeURIComponent(password),
        bypass: "localhost,127.0.0.1",
      },
    };
  }
  // Fallback for proxy without auth
  return { proxy: { server: proxyUrl, bypass: "localhost,127.0.0.1" } };
}

const proxyConfig = parseProxyConfig();

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
    video: "on",
    trace: "on",
    // Ignore HTTPS errors when using proxy (sandbox TLS inspection)
    ignoreHTTPSErrors: Boolean(process.env.https_proxy),
    ...proxyConfig,
  },
  retries: 1,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Launch args to handle proxy authentication in sandbox
        ...(process.env.https_proxy && {
          launchOptions: {
            args: [
              `--proxy-server=${process.env.https_proxy}`,
              "--proxy-bypass-list=localhost;127.0.0.1",
            ],
          },
        }),
      },
    },
  ],
  webServer: {
    command: "pnpm dev:frontend",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
