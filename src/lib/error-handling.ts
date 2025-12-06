// TODO: Replace console.error with proper toast notifications using sonner
// Install with: pnpm add sonner
// See: https://ui.shadcn.com/docs/components/sonner

/**
 * Handles mutation errors consistently across the app.
 * Currently logs to console, should be replaced with toast notifications.
 */
export function handleMutationError(error: unknown, defaultMessage: string) {
  const message = error instanceof Error ? error.message : defaultMessage;
  console.error(message);
  // TODO: Replace with toast.error(message) after installing sonner
}
