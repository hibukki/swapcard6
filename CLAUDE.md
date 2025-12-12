These are suggestions/preferences. If you don't like them, I prefer if you said so explicitly, and we can hopefully gradually improve them. (some were copied from other places and are phrased as orders, gradually changing that)

## Creating pull requests

Please add the requested feature (as the user requested it) and not only what-was-done.
Ideally, quote all relevant user messages and put them in the PR description.
This is like adding the product-manager request, and not only the engineering solution.

## Project Overview

- Full-stack TypeScript app: React + Vite + TanStack Router (frontend), Convex (backend), Clerk (auth)

- Import alias: `@/` maps to `src/` directory
- Tailwind CSS 4 + shadcn/ui: Component library built on Radix UI with Tailwind CSS styling
- Typography: Uses `@tailwindcss/typography` with `prose prose-invert` at root level, use `not-prose` to escape (e.g., for buttons/tables)
- Environment variables: Client vars need `VITE_` prefix, Convex vars set in dashboard
- Package manager: Always use `pnpm` and `pnpx`, NOT `npm` or `npx`
- See @README.md for project-specific information

### Dev server

- You can run `pnpm dev:frontend` and `pnpm dev:backend` with `run_in_background`, and they'll be available for you to monitor (using the BashOutput tool?).
- If `pnpm dev:backend` fails due to requiring interactive input, possible solutions:
  - Ask the user to run `pnpm convex dev --once` first in a separate terminal
  - Make sure `.env.local` exists
    - and has values for
      - `VITE_CLERK_PUBLISHABLE_KEY` (documented elsewhere)
      - `CONVEX_DEPLOYMENT`
      - `VITE_CONVEX_URL` (for a local deployment, suitable e.g for running in a github action, you can use `http://127.0.0.1:3210`)
    - Values for this project might be found in `.env.claude` or `.env.example`

#### Preview deployment setup

For environments where you can't run a local backend:

```sh
pnpm run setup:preview              # Initial setup (uses branch name as preview name)
pnpm run setup:preview my-feature   # Or pass custom name
pnpm run dev:frontend               # Start frontend
```

After backend changes:

```sh
pnpm run deploy:preview
```

## Convex

- `_creationTime` and `_id` are automatically added to all documents.
- Adding required fields breaks existing data, you could ask the user to clear the database or plan a migration.
- Convex functions throw `ConvexError`, not generic `Error`
- Queries have 16MB/10s limits - prefer to use indexes, not full table scans
- Paginated queries: use `.paginate(paginationOpts)` with `paginationOptsValidator`
- Scheduled tasks: `ctx.scheduler.runAfter(delay, internal.module.function, args)` or `ctx.scheduler.runAt(timestamp, ...)`
- Unique fields: enforce in mutation logic, indexes don't guarantee uniqueness
- Soft delete: you can add `deletedAt: v.optional(v.number())` field instead of `.delete()`
- System tables: access `_scheduled_functions` and `_storage` with `ctx.db.system.get` and `ctx.db.system.query`
- Default query order is ascending by `_creationTime`
- Transactions are per-mutation - can't span multiple mutations. Calling multiple queries/mutation in a single action may introduce race conditions.
- Hot reload issues: Restart if schema changes don't apply or types are stuck
- Use `import { Doc, Id } from "./_generated/dataModel";` and `v.id("table")` for type safety.
- Add `"use node";` to the top of files containing actions that use Node.js built-in modules (can't contain queries and mutations)
- `"use node";` is NOT needed for fetch, only use it for other Node.js built-ins
- Convex + Clerk: Always use Convex's auth hooks (`useConvexAuth`) and components (`<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`) instead of Clerk's hooks/components. This ensures auth tokens are properly validated by the Convex backend.
- Import data with `pnpm convex import --table tableName file.json`

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

## Other Guidelines

- When stuck: consider official docs (docs.convex.dev, tanstack.com, ui.shadcn.com). Also, CLAUDE_EXTRA.md contains docs for common use cases of libraries in this project.
- Never leave floating promisses, use void when needed
- Comments shouldn't be used if the code can be self-documenting.

## Ending messages

Please end every message with a cat emoji, or one or more emojis of your choice (if you have a preference for that message). Same for PR descriptions.
