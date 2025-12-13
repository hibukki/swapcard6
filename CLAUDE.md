# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

These are suggestions/preferences. If you don't like them, say so explicitly, and we can gradually improve them.

## Project Overview

Full-stack TypeScript: React + Vite + TanStack Router (frontend), Convex (backend), Clerk (auth), Tailwind CSS 4 + shadcn/ui.

- Package manager: Always use `pnpm` and `pnpx`, NOT `npm` or `npx`
- Import alias: `@/` maps to `src/`
- Typography: `prose prose-invert` at root, use `not-prose` to escape

## Key Gotchas

### Convex + TanStack Query Auth
When adding auth to a query (`ctx.auth.getUserIdentity()`), update its loader:
```typescript
if ((window as any).Clerk?.session) await queryClient.ensureQueryData(authQuery)
```
Otherwise the app crashes on page refresh.

### Convex Auth
Use Convex's auth hooks (`useConvexAuth`) and components (`<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`) instead of Clerk's.

### Convex Queries
- Do NOT use `.filter()` - define an index and use `.withIndex()` instead
- No `.delete()` in queries - collect results and call `ctx.db.delete()` on each
- Throw `ConvexError`, not generic `Error`

### Backend Organization
Keep functions simple/CRUD-like. If circular deps arise, create `*Utils.ts` files.

## Dev Server

Run `pnpm dev:frontend` and `pnpm dev:backend` with `run_in_background`.

If backend requires interactive input:
- Ask user to run `pnpm convex dev --once` first
- Ensure `.env.local` exists (copy from `.env.example` or `.env.claude`)

## Workflow

- Never leave floating promises, use `void` when needed
- When stuck: check CLAUDE_EXTRA.md and docs (docs.convex.dev, tanstack.com, ui.shadcn.com)
- Run the review agent after `git commit`

## Pull Requests

Include the requested feature (as the user described it), not only what was done. Quote relevant user messages.

## Ending Messages

End every message with a cat emoji, or emojis of your choice. For each reviewer pass, add another positive emoji like a strawberry.
