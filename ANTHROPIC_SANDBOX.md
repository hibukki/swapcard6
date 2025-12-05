# Anthropic Sandbox Network Environment

Official docs: https://github.com/anthropic-experimental/sandbox-runtime

All outbound traffic goes through an egress proxy (`https_proxy` env var).

## What Works / Doesn't Work

```bash
# Check proxy is set
echo "Proxy: ${https_proxy:+set (${#https_proxy} chars)}"

# ✅ curl works (uses proxy automatically)
curl -s https://httpbin.org/ip | head -c 100

# ✅ Node.js fetch with undici ProxyAgent works
node -e 'const{ProxyAgent,setGlobalDispatcher,fetch}=require("undici");setGlobalDispatcher(new ProxyAgent(process.env.https_proxy));fetch("https://httpbin.org/ip").then(r=>r.text()).then(console.log)'

# ❌ Node.js fetch WITHOUT proxy fails
node -e 'fetch("https://httpbin.org/ip").then(r=>r.text()).then(console.log).catch(e=>console.log("Failed:",e.cause?.code||e.message))'

# ❌ WebSocket fails (ConvexClient uses WebSocket internally)
node -e 'const{ConvexClient}=require("convex/browser");const c=new ConvexClient("https://bright-woodpecker-6.convex.cloud");setTimeout(()=>{console.log("WS state after 3s: likely failed silently");process.exit()},3000)'
```

## Browser Limitation

Playwright/Chromium cannot establish HTTPS connections to external services through the proxy (`ERR_TUNNEL_CONNECTION_FAILED`). E2E tests requiring external resources (e.g., Clerk CDN) won't work in sandbox.
