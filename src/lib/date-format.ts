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

/**
 * Format a date for navigation/header display.
 * Shows contextual dates with disambiguation:
 * - "Today", "Tomorrow", "Yesterday"
 * - "Monday (Jan 15)" for weekdays within ±6 days
 * - "Jan 15" for dates beyond that
 *
 * @param date - The date to format
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted string
 */
export function formatDateForNav(
  date: Date,
  locale: string | string[] = "en-US"
): string {
  const now = new Date();
  const daysDiff = getDaysDiff(now, date);

  if (daysDiff === 0) {
    return "Today";
  } else if (daysDiff === 1) {
    return "Tomorrow";
  } else if (daysDiff === -1) {
    return "Yesterday";
  } else if (daysDiff >= -6 && daysDiff <= 6) {
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    const shortDate = date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
    return `${weekday} (${shortDate})`;
  } else {
    return date.toLocaleDateString(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Get a local date string in YYYY-MM-DD format.
 * Uses local timezone to avoid UTC conversion issues.
 */
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Parse a YYYY-MM-DD string into year, month, day components.
 */
export function parseDateString(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

/**
 * Create a local Date from a YYYY-MM-DD string.
 * Avoids UTC conversion issues by using Date constructor with components.
 */
export function fromDateString(dateStr: string): Date {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(year, month - 1, day);
}

/**
 * Add or subtract days from a date string.
 * Returns a new YYYY-MM-DD string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day + days);
  return toLocalDateString(date);
}

/**
 * Format a Date to a datetime-local input value.
 *
 * Interprets the Date using the runtime's local timezone (via getHours, getMinutes, etc.).
 * This matches HTML datetime-local input behavior which displays/accepts local time.
 *
 * @example
 * // If local timezone is UTC-5:
 * formatDateTimeLocal(new Date("2024-01-15T15:30:00Z")) // "2024-01-15T10:30"
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
