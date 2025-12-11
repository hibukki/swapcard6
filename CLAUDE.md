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

### File uploads

- generate upload URL in mutation (`ctx.storage.generateUploadUrl()`)
- POST from client
- store ID (take `v.id("_storage")`)
- serve with `ctx.storage.getUrl(fileId)` in queries

### Other Convex Features (refer to docs and install as necessary)

- Text search: docs.convex.dev/search/text-search
- Crons: docs.convex.dev/scheduling/cron-jobs
- Durable long-running code flows with retries and delays: convex.dev/components/workflow
- AI agent framework with persistent conversations and tools: convex.dev/components/agent. See https://github.com/get-convex/agent/blob/main/examples/chat-streaming/README.md for a chat example.
- Prioritize tasks with separate customizable queues: convex.dev/components/workpool
- Sync engine for ProseMirror-based editors: convex.dev/components/collaborative-text-editor-sync
- Send and receive SMS with queryable status: convex.dev/components/twilio-sms
- Add subscriptions and billing integration: convex.dev/components/polar
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
- Nested routes require parent to have `<Outlet />`, use `.index.tsx` files to show content at parent paths

## TanStack Query + Convex Integration

- Use `convexQuery()` from `@convex-dev/react-query` to create query options: `const queryOptions = convexQuery(api.module.function, { status: "active" })`
- Preload in route loaders: `loader: async ({ context: { queryClient } }) => await queryClient.ensureQueryData(queryOptions)`
- Use `useSuspenseQuery` in components: `const { data } = useSuspenseQuery(queryOptions)`
- For mutations, continue using Convex's `useMutation` directly
- **When adding auth to a query** (`ctx.auth.getUserIdentity()`), update its loader: `if ((window as any).Clerk?.session) await queryClient.ensureQueryData(authQuery)` - otherwise the app crashes on page refresh

## TanStack Form + Zod v4

- No adapter needed - TanStack Form natively supports Standard Schema libraries like Zod v4
- Form-level validation:
  ```tsx
  const schema = z.object({ name: z.string().min(1) });
  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: schema },
  });
  ```
- Field errors are StandardSchemaV1Issue[] with .message property:
  ```tsx
  {
    !field.state.meta.isValid && (
      <em>{field.state.meta.errors.map((e) => e.message).join(", ")}</em>
    );
  }
  ```
- Number inputs use valueAsNumber:
  ```tsx
  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
  ```
- Field validation can override form validation - design hierarchy carefully
- Submit handler: `onSubmit: async ({ value }) => { await mutate(value); form.reset(); }`
- Disable during submit: `<button disabled={!form.state.canSubmit || form.state.isSubmitting}>`
- Async validation: use `onChangeAsync` for server-side checks

## Styling with shadcn/ui

### Component System

- Components are built on Radix UI primitives with Tailwind CSS styling
- Import components directly from their files: `import { Button } from "@/components/ui/button"`
- Customize via `src/index.css` using CSS variables for theming
- Use the `cn()` utility from `@/lib/utils` to merge Tailwind classes safely

### Available UI Components

Base components in `src/components/ui/`:

- `Button`: Clickable buttons with variants (default, destructive, success, outline, secondary, ghost, link)
- `Card`: Container with CardHeader, CardTitle, CardDescription, CardContent, CardFooter parts
- `Badge`: Small status indicators with variants (default, secondary, success, warning, destructive, outline)
- `Input`, `Textarea`, `Label`: Form input components
- `Dialog`: Modal dialogs with DialogTrigger, DialogContent, DialogHeader, DialogTitle, etc.
- `DropdownMenu`: Dropdown menus with various sub-components
- `Avatar`: User avatars with AvatarImage and AvatarFallback
- `Separator`: Visual dividers
- `Checkbox`: Checkbox inputs
- `Spinner`: Loading indicators

Pattern components in `src/components/patterns/`:

- `FormField`: Form field wrapper with label, description, and error display
- `InfoBox`: Callout boxes with icon, title, and variant styling (default, success, info, warning, destructive)
- `StatusBadge`: Meeting status badges with appropriate colors
- `UserAvatarRow`: User avatar with name in a row layout
- `EmptyState`: Empty state displays with icon, title, and description

### Custom Additions

**Button component customizations:**

- `active` prop: Applies accent background to indicate active state (custom addition, not in standard shadcn)
- `success` variant: Green success button styling
- Custom sizes: `xs`, `icon-sm`, `icon-xs` for smaller buttons

### Component Variants with CVA

Components use `class-variance-authority` (cva) for variant management:

```tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "...", sm: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### Color System

CSS variables defined in `src/index.css`:

- Semantic: `primary`, `secondary`, `accent`, `muted`, `card`, `popover`
- Status: `success`, `info`, `warning`, `destructive`
- Text: Each color has matching `-foreground` variant (e.g., `primary-foreground`)
- Use Tailwind classes: `bg-primary`, `text-primary-foreground`, `border-border`
- Dark mode automatically handled via CSS variables

### Usage Guidelines

- Always import components from individual files, not from `@/components/ui` barrel export
- Use pattern components (`FormField`, `InfoBox`, etc.) for consistent UX
- Combine components with Tailwind utilities for custom styling
- For complex styling, use the `cn()` utility to merge classes
- Typography plugin adds default margins to headings - use `mt-0` to override when precise spacing is needed
- Reference shadcn/ui docs when unfamiliar: [ui.shadcn.com](https://ui.shadcn.com)

## Other Guidelines

- When stuck: consider official docs (docs.convex.dev, tanstack.com, ui.shadcn.com)
- Verify responsive design at multiple breakpoints
- Import icons from `lucide-react`
- When making identical changes to multiple occurrences, use Edit with `replace_all: true` instead of MultiEdit. Avoid MultiEdit whenever possible, it is unreliable.
- Never leave floating promisses, use void when needed
- Comments shouldn't be used if the code can be self-documenting.
