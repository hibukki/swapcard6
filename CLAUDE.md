# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Main Development Commands

- `pnpm run init` - First-time setup: installs dependencies and initializes Convex
- `pnpm dev` - Starts both frontend (Vite) and backend (Convex) in parallel
- `pnpm run lint` - Run TypeScript compilation and ESLint with strict settings
- `pnpm convex dev --once` - **Required for validation**: Run after any backend changes to update local backend and verify deployment compatibility

**Note**: Some commands, including `convex dev --once`, may fail due to being interactive. If this happens, You should ask the user to run the command manually in their terminal, and then continue with the next steps.

## Architecture Overview

### Full-Stack Structure

This is a TypeScript full-stack application using:

- **Frontend**: React + Vite + TanStack Router (file-based routing)
- **Backend**: Convex (real-time database + serverless functions)
- **Authentication**: Clerk with Convex integration
- **Styling**: Tailwind CSS + DaisyUI components

### Key Patterns

**Convex Functions**: Located in `convex/` directory

- Schema definitions in `convex/schema.ts`
- Queries, mutations, and actions in separate files (e.g., `messages.ts`, `users.ts`)
- Authentication config in `convex/auth.config.ts`

**Frontend Routing**: File-based routing in `src/routes/`

- `__root.tsx` - Root layout with authentication states and navigation
- Route files define pages (e.g., `index.tsx` for `/`)
- Uses TanStack Router with type-safe navigation

**Authentication Flow**:

- Clerk handles authentication UI and tokens
- `InitializeUser` component in root automatically creates Convex user records
- Two distinct layouts: authenticated (with sidebar/navbar) vs unauthenticated
- Uses `<Authenticated>` and `<Unauthenticated>` components for conditional rendering

**State Management**:

- Convex handles backend state with real-time subscriptions
- React hooks (`useQuery`, `useMutation`) for Convex integration
- Local component state for UI interactions

### Database Schema

- `users` table: `clerkId` (string), `name` (string) with index on `clerkId`
- Additional tables defined as needed for your application

### Environment Variables

- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `CLERK_JWT_ISSUER_DOMAIN` - Server-side Clerk configuration

### Import Aliases

- `@/` maps to `src/` directory (configured in `vite.config.ts`)

## Convex Backend Patterns

### Function Types

- **Queries**: Read-only database operations with automatic caching and real-time updates
- **Mutations**: Transactional database writes, cannot call external APIs
- **Actions**: Can call external services (no direct DB access, use via `ctx.runQuery`/`ctx.runMutation`)

### Authentication Patterns

```typescript
// Get authenticated user identity
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

// Auto-create user pattern
const userId = await ctx.runMutation(api.users.getOrCreateAuthedUser, {});
```

### Function Organization

- **Public functions**: Use `query`, `mutation`, `action` for client-accessible APIs
- **Internal functions**: Use `internalQuery`, `internalMutation`, `internalAction` for private logic
- **File-based routing**: Function in `convex/users.ts` named `getUser` → `api.users.getUser`

### Function References & Calling

```typescript
// Call functions using references, not direct imports
const result = await ctx.runQuery(api.users.getUser, { id: userId });
const data = await ctx.runMutation(internal.helpers.processData, { input });

// TypeScript: Add type annotation for same-file calls
const result: string = await ctx.runQuery(api.example.myFunction, { args });
```

### TypeScript Patterns

```typescript
import { Id } from "./_generated/dataModel";

// Use specific Id types, not generic strings
args: { userId: v.id("users") }, // Results in Id<"users"> type

// Type-safe record mapping
const userMap: Record<Id<"users">, string> = {};
```

### Database Query Patterns

```typescript
// Index-based queries (preferred for performance)
const user = await ctx.db
  .query("users")
  .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
  .unique();

// Collection queries
const records = await ctx.db.query("tableName").collect();

// Filtered queries with ordering
const results = await ctx.db
  .query("tableName")
  .withIndex("by_field", (q) => q.eq("field", value))
  .order("desc")
  .take(50);
```

### Schema & System Fields

```typescript
// Schema definition with indexes
defineTable({
  field: v.string(),
  userId: v.id("users"),
  // Note: _id and _creationTime are automatically added to all tables
})
  .index("by_user", ["userId"])
  .index("by_user_and_field", ["userId", "field"]); // Include all fields in index name
```

**Important**: All tables automatically include:

- `_id: Id<"tableName">` - Unique document identifier
- `_creationTime: number` - Creation timestamp
- Default index on `_creationTime` for ordering

### Validation Patterns

```typescript
// Argument validation
args: {
  name: v.string(),
  userId: v.id("users"),
  optional: v.optional(v.string()),
  data: v.object({ field: v.string() })
}
```

### Query Performance Guidelines

- **Default ordering**: Documents return in ascending `_creationTime` order by default
- **Prefer indexes over filters**: Use `withIndex` instead of `filter` for performance
- **Index naming**: Include all fields in index name (e.g., `"by_status_and_priority"`)

```typescript
// Pagination with validator
import { paginationOptsValidator } from "convex/server";

args: { paginationOpts: paginationOptsValidator },
handler: async (ctx, args) => {
  return await ctx.db
    .query("table")
    .order("desc")
    .paginate(args.paginationOpts);
}

// Efficient filtering with indexes (preferred)
const results = await ctx.db
  .query("table")
  .withIndex("by_status_and_priority", (q) =>
    q.eq("status", "active").eq("priority", "high")
  )
  .collect();

// Avoid: using filter without index (slower)
// const results = await ctx.db.query("table").filter(q => ...).collect();
```

📖 **Documentation Links**:

- [Functions](https://docs.convex.dev/functions) - Queries, mutations, actions
- [Database](https://docs.convex.dev/database) - Schema, indexing, queries
- [Authentication](https://docs.convex.dev/auth) - Auth integration patterns
- [File Storage](https://docs.convex.dev/file-storage) - File uploads and management
- [Pagination](https://docs.convex.dev/database/pagination) - Efficient large dataset handling
- [Indexes](https://docs.convex.dev/database/indexes) - Query optimization
- [Search](https://docs.convex.dev/text-search) - Full-text search with search indexes
- [Scheduling](https://docs.convex.dev/scheduling) - Cron jobs and delayed function execution
- [Components](https://docs.convex.dev/components) - Reusable backend modules (install as needed)

### Useful Components (Install Only If Needed)

- `@convex-dev/aggregate` - Real-time aggregations and counters
- `@convex-dev/rate-limiter` - Rate limiting for API endpoints
- `@convex-dev/migrations` - Database migration utilities

## TanStack Router Patterns

### File-Based Routing Conventions

- Routes defined in `src/routes/` directory
- `__root.tsx` - Root layout component (wraps all routes)
- Route files export `createFileRoute("/path")` with component
- Use `<Link>` for navigation with type-safe routes

### Route Creation Pattern

```typescript
export const Route = createFileRoute("/path")({
  component: PageComponent,
});
```

### Navigation Patterns

```typescript
// Type-safe navigation with activeProps
<Link
  to="/path"
  activeProps={{ className: "btn btn-ghost btn-active" }}
>
  Navigation
</Link>

// Navigation with search parameters
<Link
  to="/path"
  search={{ page: 1, filter: "active" }}
>
  With Params
</Link>
```

📖 **Documentation Links**:

- [File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Search Parameters](https://tanstack.com/router/latest/docs/framework/react/guide/search-params) - Type-safe URL state
- [Route Context](https://tanstack.com/router/latest/docs/framework/react/guide/route-context) - Data loading patterns
- [Authentication](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) - Protected routes

## TanStack Form Patterns

### Form Setup with Validation

```typescript
const form = useForm({
  defaultValues: { field: "" },
  validators: {
    onChange: formSchema, // Zod schema
  },
  onSubmit: async ({ value }) => {
    await submitData(value);
    form.reset();
  },
});
```

### Field Patterns

```typescript
<form.Field
  name="fieldName"
  validators={{
    onChange: ({ value }) => !value ? "Required" : undefined
  }}
>
  {(field) => (
    <input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  )}
</form.Field>
```

### Form State Management

- `form.state.canSubmit` - Form validation state
- `form.state.isSubmitting` - Async submission state
- `field.state.meta.errors` - Field-level errors

📖 **Documentation Links**:

- [Quick Start](https://tanstack.com/form/latest/docs/framework/react/quick-start) - Basic form setup
- [Validation](https://tanstack.com/form/latest/docs/framework/react/guides/validation) - Schema and field validation
- [Form State](https://tanstack.com/form/latest/docs/framework/react/reference/useForm) - State management reference

## DaisyUI Component Patterns

### Component Structure

- Base classes: `btn`, `card`, `input`, `chat`, `alert`
- Modifiers: `btn-primary`, `card-body`, `input-bordered`
- Sizes: `btn-sm`, `btn-lg`, `input-xs`

### Common Component Patterns

```typescript
// Cards
<div className="card">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>

// Form controls
<div className="form-control">
  <label className="label">
    <span className="label-text">Field Label</span>
  </label>
  <input className="input input-bordered" />
</div>

// Joined components
<div className="join">
  <input className="input input-bordered join-item" />
  <button className="btn join-item">Submit</button>
</div>

// Alerts
<div className="alert alert-success">
  <span>Success message</span>
</div>
```

### Loading States

- `loading loading-spinner loading-xs` for spinners
- `btn` with `disabled` attribute for form submission states

📖 **DaisyUI Documentation**: https://daisyui.com/llms.txt
