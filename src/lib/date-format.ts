/**
 * Short date/time formatting utilities.
 *
 * Formats dates contextually to save space and reduce cognitive load:
 * - Today: "10:30 AM"
 * - Within 5 days: "Tuesday, 10:30 AM"
 * - Later: "Jan 15, 10:30 AM"
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
  locale?: string | string[];
}

/**
 * Format a timestamp with short date display.
 *
 * @param timestamp - UTC timestamp in milliseconds
 * @param options - Formatting options
 * @returns Formatted string and full date for tooltip
 */
export function formatShortDate(
  timestamp: number,
  options: FormatOptions = {}
): { display: string; tooltip: string } {
  const { includeTime = true, locale = [] } = options;
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
  } else if (daysDiff >= 0 && daysDiff <= 5) {
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    display = includeTime ? `${weekday}, ${timeStr}` : weekday;
  } else if (daysDiff >= -5 && daysDiff < 0) {
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    display = includeTime ? `${weekday}, ${timeStr}` : weekday;
  } else {
    const shortDate = date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
    display = includeTime ? `${shortDate}, ${timeStr}` : shortDate;
  }

  return { display, tooltip };
}

/**
 * Format a time range for display.
 */
export function formatTimeRange(startTime: number, endTime: number): string {
  const start = new Date(startTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
}
