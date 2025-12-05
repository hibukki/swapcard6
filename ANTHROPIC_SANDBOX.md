# Running in Anthropic Sandbox

This document explains the network environment when running in Anthropic's sandbox (Claude Code remote sessions).

## Network Proxy

All outbound network traffic must go through an egress proxy. The proxy URL is available in:
- `https_proxy` environment variable
- `HTTP_PROXY` / `HTTPS_PROXY` (uppercase variants)

### What Works

| Method | Works? | Notes |
|--------|--------|-------|
| `curl` | ✅ | Automatically uses `https_proxy` |
| Node.js `fetch` with undici ProxyAgent | ✅ | Requires `setGlobalDispatcher(new ProxyAgent(url))` |
| Convex HTTP client | ✅ | Uses fetch internally |
| WebSocket connections | ❌ | Proxy doesn't support WebSocket upgrade |
| Browser HTTPS to external domains | ❌ | `ERR_TUNNEL_CONNECTION_FAILED` |

### Browser Limitation

Playwright/Chromium cannot establish HTTPS connections to external services (like Clerk's CDN) through the proxy. The browser fails with `net::ERR_TUNNEL_CONNECTION_FAILED` when attempting CONNECT tunnels.

This means e2e tests that require:
- Clerk authentication UI (loads JS from `*.clerk.accounts.dev`)
- Any external CDN resources

...will not work in the sandbox environment.

## Convex Backend

Since you can't run a local Convex backend, use **preview deployments**:

```bash
# Create a new preview deployment
pnpx convex deploy --preview-create my-preview-name

# Set environment variables on it
pnpx convex env set IS_TEST true --preview-name my-preview-name

# Re-deploy after code changes
pnpx convex deploy --preview-name my-preview-name
```

The preview URL (e.g., `https://bright-woodpecker-6.convex.cloud`) goes in `.env.local`:

```
VITE_CONVEX_URL=https://your-preview-url.convex.cloud
```

## Code Patterns

### Node.js: Enable Proxy for fetch

```typescript
import { ProxyAgent, setGlobalDispatcher } from "undici";

if (process.env.https_proxy) {
  setGlobalDispatcher(new ProxyAgent(process.env.https_proxy));
}
```

### Convex: Use HTTP Client Instead of WebSocket

```typescript
import { ConvexHttpClient } from "convex/browser";

// ConvexClient uses WebSocket (doesn't work through proxy)
// ConvexHttpClient uses fetch (works with undici ProxyAgent)
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
```

### Playwright: Configure Browser Proxy

```typescript
// playwright.config.ts
function parseProxyConfig() {
  const proxyUrl = process.env.https_proxy;
  if (!proxyUrl) return {};

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
  return {};
}
```

## Detecting Sandbox Environment

```typescript
const isAnthropicSandbox = Boolean(process.env.https_proxy);
```

## Workarounds for E2E Tests

Since browser external HTTPS doesn't work, options include:

1. **Skip e2e tests in sandbox** - Run them in CI with proper network access
2. **Mock external services** - Use service workers or test doubles
3. **Request network exceptions** - Ask for specific domains to be allowed
