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

## License

MIT