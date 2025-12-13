# OpenCon

[![Lint](https://github.com/hibukki/swapcard6/actions/workflows/lint.yml/badge.svg)](https://github.com/hibukki/swapcard6/actions/workflows/lint.yml)

[![Tests](https://github.com/hibukki/swapcard6/actions/workflows/test.yml/badge.svg)](https://github.com/hibukki/swapcard6/actions/workflows/test.yml)

A conference networking platform focused on low-friction 1-on-1 meetings between attendees.

## Screenshots

Auto-generated from e2e tests - see [docs/screenshots](docs/screenshots/) for current app views.

## Getting Started

```bash
pnpm run init
```

## Development

### Run the dev server

```bash
pnpm run dev:backend
```

And in another shell:

```bash
pnpm run dev:frontend
```

### Lint

```bash
pnpm run lint
```

### Tests

```bash
pnpm run test:e2e
```

## Deployment

```bash
pnpm run deploy           # Deploy both backend and frontend
pnpm run deploy:backend   # Deploy Convex to production
pnpm run deploy:frontend  # Build and deploy to Netlify
```

## License

MIT
