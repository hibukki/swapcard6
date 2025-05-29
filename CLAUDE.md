## Project Overview

- Full-stack TypeScript app: React + Vite + TanStack Router (frontend), Convex (backend), Clerk (auth)
- Development: Use `mcp__shell-commands__launch-dev-all` to start servers, then monitor output streams for validation
- Import alias: `@/` maps to `src/` directory
- Tailwind CSS 4: All config in `src/index.css` via CSS syntax, NOT tailwind.config.js
- Environment variables: Client vars need `VITE_` prefix, Convex vars set in dashboard

## Git Workflow

- Create frequent small commits for each unit of work: `git add -A && git commit -m "[action]: [specific description]"`
- Maintain `.claude-notes.md` with current context, progress, and next steps - commit this file with each checkpoint
- When feature complete and user approves: `git reset --soft [first-commit-of-feature]` then `git commit -m "feat: [complete feature description]"`
- Never push without user confirmation
- Before major feature work: Tell user "Starting [feature], will make frequent small commits then squash when complete"
- Claude Code notes file should include:
  - Current feature being worked on
  - Progress status and next steps
  - Important context or decisions made
  - Relevant file locations or dependencies

## Testing & Validation

- Validation: Monitor MCP output streams for TypeScript/compilation errors
- Test UI with Puppeteer MCP: detect screen size first with `puppeteer_evaluate`
- Puppeteer limitations: text selection unreliable, no console access via MCP
- Ask user to navigate browser to relevant state before screenshots
- Request console logs from user when debugging: "Can you check the browser console?"
- Take screenshots at detected dimensions AND mobile (375x667) for responsive testing

## Convex

- `_creationTime` and `_id` are automatically added to all documents.
- Adding required fields breaks existing data - if early in development, ask the user to clear the database. Otherwise, plan migration.
- Use `ConvexError` for client-friendly errors, not generic Error
- Queries have 16MB/10s limits - always use indexes, never full table scans
- Paginated queries: use `.paginate(paginationOpts)` with `paginationOptsValidator`
- Scheduled tasks: `ctx.scheduler.runAfter(delay, internal.module.function, args)` or `ctx.scheduler.runAt(timestamp, ...)`
- Unique fields: enforce in mutation logic, indexes don't guarantee uniqueness
- Soft delete: add `deletedAt: v.optional(v.number())` field instead of `.delete()`
- System tables: access `_scheduled_functions` and `_storage` with `ctx.db.system.get` and `ctx.db.system.query`
- Default query order is ascending by `_creationTime`
- Transactions are per-mutation - can't span multiple mutations. Calling multiple queries/mutation in a single action may introduce race conditions.
- Hot reload issues: Restart if schema changes don't apply or types are stuck
- Use `import { Doc, Id } from "./_generated/dataModel";` and `v.id("table")` for type safety.
- Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.

### Function guidelines

- Import `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, `internalAction` from `./_generated/server` and call to register functions.
- Use `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction` to call functions from other functions. e.g.: `import { api, internal } from "./_generated/api";` and then `ctx.runQuery(internal.module.function, { arg })`.
- If calling functions causes unexpected type errors, try adding a type annotation (helps circularity): `const result: string = await ctx.runQuery(api.module.function, { arg });`
- Actions can't directly access DB - use `ctx.runQuery` / `ctx.runMutation`

### Validator guidelines

- Always use an args validator for functions
- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

### Query guidelines

- Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.

### Mutation guidelines

- Use `ctx.db.replace` to fully replace an existing document.
- Use `ctx.db.patch` to shallow merge updates into an existing document.

### File uploads

- generate upload URL in mutation (`ctx.storage.generateUploadUrl()`)
- POST from client
- store ID (take `v.id("_storage")`)
- serve with `ctx.storage.getUrl(fileId)` in queries

### Other Convex Features (refer to docs as necessary)

- Text search: docs.convex.dev/search/text-search
- Crons: docs.convex.dev/scheduling/cron-jobs
- Durable long-running code flows with retries and delays: convex.dev/components/workflow
- Organize AI workflows with message history and vector search: convex.dev/components/ai-agent
- Prioritize tasks with separate customizable queues: convex.dev/components/workpool
- Sync engine for ProseMirror-based editors: convex.dev/components/collaborative-text-editor-sync
- Send and receive SMS with queryable status: convex.dev/components/twilio-sms
- Add subscriptions and billing integration: convex.dev/components/polar
- Stream text to browser while storing to database (good for LLM calls): convex.dev/components/persistent-text-streaming
- Type-safe application-layer rate limits with sharding: convex.dev/components/rate-limiter
- Framework for long-running data migrations: convex.dev/components/migrations
- Distributed counter for high-throughput operations: convex.dev/components/sharded-counter
- Cache action results to improve performance: convex.dev/components/action-cache
- Data aggregation and denormalization operations: convex.dev/components/aggregate
- Register and manage cron jobs at runtime: convex.dev/components/crons

## TanStack Router

- Avoid `const search = useSearch()` - use `select` option instead
- Route params update quirks - preserve location when updating
- Search params as filters: validate with zod schema in route definition
- Navigate programmatically: `const navigate = useNavigate()` then `navigate({ to: '/path' })`
- Type-safe links: always use `<Link to="/path">` not `<a href>`

## TanStack Form

- Field validation can override form validation - design hierarchy carefully
- Submit handler: `onSubmit: async ({ value }) => { await mutate(value); form.reset(); }`
- Field errors: `{field.state.meta.errors && <span>{field.state.meta.errors}</span>}`
- Disable during submit: `<button disabled={!form.state.canSubmit || form.state.isSubmitting}>`
- Async validation: use `onChangeAsync` for server-side checks

## DaisyUI

- Always use idiomatic DaisyUI when possible, with semantic component classes: `btn`, `card`, `alert`, etc.
- Combine with modifiers: `btn-primary`, `card-bordered`
- Join components: wrap in `<div className="join">`
- Loading states: `loading loading-spinner loading-xs`

## Important Rules

- When stuck: check official docs first (docs.convex.dev, tanstack.com)
- Ask before installing new dependencies
- Verify responsive design at multiple breakpoints
- Document non-obvious implementation choices in this file
