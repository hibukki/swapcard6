# SwapCard6

A conference networking platform focused on low-friction 1-on-1 meetings between attendees.

## Features

- **Profile Management**: Create and edit your professional profile with bio, company, role, and interests
- **Attendee Discovery**: Browse all conference attendees and view their profiles
- **Meeting Requests**: Send meeting requests with optional messages and locations
- **Request Management**: Accept or decline incoming meeting requests
- **Agenda View**: See your upcoming scheduled meetings and pending requests

## Tech Stack

- **Frontend**: React, TanStack Router, TanStack Query, TanStack Form
- **Backend**: Convex (real-time database and serverless functions)
- **Auth**: Clerk
- **Styling**: Tailwind CSS 4, daisyUI 5
- **Build**: Vite

## Project Structure

```
├── convex/
│   ├── schema.ts           # Database schema (users, meetingRequests, meetings)
│   ├── users.ts            # User profile queries and mutations
│   ├── meetings.ts         # Meeting and request functions
│   └── auth.config.ts      # Clerk authentication config
├── src/
│   ├── routes/
│   │   ├── __root.tsx      # Root layout with navigation
│   │   ├── index.tsx       # Home page
│   │   ├── profile.tsx     # Profile editing page
│   │   ├── attendees.tsx   # Browse attendees and send requests
│   │   └── agenda.tsx      # View meetings and manage requests
│   └── main.tsx
└── package.json
```

## Getting Started

```bash
pnpm run init
```

This will:
- Install dependencies
- Set up Clerk authentication
- Initialize Convex
- Start the development servers

## Development

```bash
pnpm dev
```

This runs both the Vite frontend and Convex backend in parallel.

## GitHub Actions - Claude Code Integration

This project uses [Claude Code](https://docs.claude.com/en/docs/claude-code) via GitHub Actions. Tag `@claude` in issue or PR comments to get AI assistance with development tasks.

### Setup Requirements

To enable the Claude Code GitHub Action with Convex preview deployments:

1. **Get your Convex Deploy Key**:
   - Go to your [Convex Dashboard](https://dashboard.convex.dev)
   - Navigate to Settings → Deploy Keys
   - Generate a new deploy key

2. **Add GitHub Secrets**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add `CONVEX_DEPLOY_KEY` with the deploy key from step 1
   - Ensure `CLAUDE_CODE_OAUTH_TOKEN` is also configured (for Claude Code)

3. **How it works**:
   - When you tag `@claude` in an issue/PR comment, the workflow automatically:
     - Deploys Convex functions to a preview deployment (named `issue-{number}` or `pr-{number}`)
     - Configures environment variables to connect to the preview backend
     - Runs Claude Code with access to the live preview deployment
   - Each new run on the same issue/PR replaces the previous preview deployment
   - Preview deployments are automatically cleaned up after 14 days of inactivity

4. **Manual cleanup** (optional):
   - View and delete preview deployments from the [Convex Dashboard](https://dashboard.convex.dev)
   - Navigate to your project → Deployments to see all active previews

## License

MIT