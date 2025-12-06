/**
 * Short date/time formatting utilities.
 *
 * Formats dates contextually to save space and reduce cognitive load:
 * - Today: "10:30 AM"
 * - Yesterday/Tomorrow: "Yesterday, 10:30 AM"
 * - Within 5 days (±2-5): "Tuesday, 10:30 AM"
 * - Beyond 5 days: "Jan 15, 10:30 AM"
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Check if two dates are on the same day.
 * Note: This compares in local timezone. Near midnight boundaries, this may
 * show "Today" for timestamps that are technically in a different UTC day.
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getDaysDiff(from: Date, to: Date): number {
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toStart.getTime() - fromStart.getTime()) / MS_PER_DAY);
}

interface FormatOptions {
  includeTime?: boolean;
  locale: string | string[];
}

/**
 * Format a timestamp with short date display.
 *
 * @param timestamp - UTC timestamp in milliseconds
 * @param options - Formatting options (locale is required)
 * @returns Formatted string and full date for tooltip
 */
export function formatShortDate(
  timestamp: number,
  options: FormatOptions
): { display: string; tooltip: string } {
  const { includeTime = true, locale } = options;
  const date = new Date(timestamp);
  const now = new Date();
  const daysDiff = getDaysDiff(now, date);

  const timeStr = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });

  const fullDate = date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tooltip = `${fullDate}${includeTime ? `, ${timeStr}` : ""}`;

  let display: string;

  if (isSameDay(date, now)) {
    display = includeTime ? timeStr : "Today";
  } else if (daysDiff === 1) {
    display = includeTime ? `Tomorrow, ${timeStr}` : "Tomorrow";
  } else if (daysDiff === -1) {
    display = includeTime ? `Yesterday, ${timeStr}` : "Yesterday";
  } else if (daysDiff >= 2 && daysDiff <= 5) {
    // 2-5 days in the future: show weekday
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    display = includeTime ? `${weekday}, ${timeStr}` : weekday;
  } else if (daysDiff >= -5 && daysDiff <= -2) {
    // 2-5 days in the past: show weekday
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    display = includeTime ? `${weekday}, ${timeStr}` : weekday;
  } else {
    // More than 5 days away: show date
    const shortDate = date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
    display = includeTime ? `${shortDate}, ${timeStr}` : shortDate;
  }

  return { display, tooltip };
}

/**
 * Format a timestamp for chat list display.
 * Shows time for today, weekday for recent, date for older messages.
 */
export function formatChatTimestamp(
  timestamp: number,
  locale: string | string[] = "en-US"
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const daysDiff = getDaysDiff(now, date);

  if (isSameDay(date, now)) {
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (daysDiff >= -5 && daysDiff <= 5 && daysDiff !== 0) {
    return date.toLocaleDateString(locale, { weekday: "long" });
  } else {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Format a time range for display.
 */
export function formatTimeRange(
  startTime: number,
  endTime: number,
  locale: string | string[] = "en-US"
): string {
  const start = new Date(startTime).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endTime).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
}
