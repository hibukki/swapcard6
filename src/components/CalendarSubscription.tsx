import { useMutation } from "convex/react";
import { Calendar, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export function CalendarSubscription() {
  const getOrCreateToken = useMutation(api.users.getOrCreateCalendarToken);
  const regenerateToken = useMutation(api.users.regenerateCalendarToken);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
  const baseUrl = convexUrl.replace(".cloud", ".site");

  const handleGetUrl = async () => {
    setIsLoading(true);
    try {
      const token = await getOrCreateToken({});
      setCalendarUrl(`${baseUrl}/calendar/${token}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      const token = await regenerateToken({});
      setCalendarUrl(`${baseUrl}/calendar/${token}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!calendarUrl) return;
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Calendar Subscription
      </h2>
      <p className="text-sm opacity-70 mb-4">
        Subscribe to your meetings in Google Calendar or other calendar apps.
        New meetings will sync automatically (may take up to 24 hours).
      </p>

      {!calendarUrl ? (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => void handleGetUrl()}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Get Calendar URL"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={calendarUrl}
              className="input input-border input-sm flex-1 font-mono text-xs"
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => void handleCopy()}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="text-sm opacity-70">
            <p className="mb-2">To subscribe in Google Calendar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Google Calendar settings</li>
              <li>Click "Add calendar" → "From URL"</li>
              <li>Paste the URL above</li>
            </ol>
          </div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => void handleRegenerate()}
            disabled={isLoading}
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate URL (invalidates old one)
          </button>
        </div>
      )}
    </div>
  );
}
