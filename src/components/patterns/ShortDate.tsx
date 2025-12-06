import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { formatShortDate, formatTimeRange } from "@/lib/date-format";

interface ShortDateProps {
  timestamp: number;
  includeTime?: boolean;
  className?: string;
}

/**
 * Displays a date with short formatting and a tooltip showing the full date.
 * See `formatShortDate` in date-format.ts for formatting rules.
 */
export function ShortDate({
  timestamp,
  includeTime = true,
  className,
}: ShortDateProps) {
  const { display, tooltip } = formatShortDate(timestamp, {
    includeTime,
    locale: "en-US",
  });

  return (
    <Tippy content={tooltip} delay={[200, 0]}>
      <span className={className}>{display}</span>
    </Tippy>
  );
}

interface ShortTimeRangeProps {
  startTime: number;
  endTime: number;
  className?: string;
}

/**
 * Displays a time range like "10:30 AM - 11:30 AM"
 */
export function ShortTimeRange({
  startTime,
  endTime,
  className,
}: ShortTimeRangeProps) {
  return (
    <span className={className}>
      {formatTimeRange(startTime, endTime, "en-US")}
    </span>
  );
}
