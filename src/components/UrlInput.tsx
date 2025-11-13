import { useState, useEffect } from "react";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Checks if a string looks like a URL but is missing the protocol (http:// or https://)
 * Examples that return true: "example.com", "www.example.com", "zoom.us/j/123"
 * Examples that return false: "example.", "just text", "https://example.com"
 */
function looksLikeUrlWithoutProtocol(value: string): boolean {
  if (!value.trim()) return false;

  // Already has a protocol
  if (/^https?:\/\//i.test(value)) return false;

  // Looks like a URL if it has:
  // - A domain-like pattern (something.something)
  // - OR contains common URL patterns
  const hasValidDomain = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+/i.test(value);
  const hasUrlPattern = /\.(com|org|net|edu|gov|io|co|dev|app|us|uk|de|fr|ca|au|jp|in|br|mx|za|cn|ru|nl|it|es|se|no|dk|fi|pl|be|at|ch|cz|gr|ie|pt|hu|ro|bg|hr|sk|si|ee|lv|lt|lu|mt|cy|is|li|mc|sm|va|ad|al|ba|by|ge|md|me|mk|rs|ua|xk|gg|im|je)\b/i.test(value);

  return hasValidDomain || hasUrlPattern;
}

export function UrlInput({ value, onChange, placeholder, className = "", required = false }: UrlInputProps) {
  const [showProtocolButton, setShowProtocolButton] = useState(false);

  useEffect(() => {
    setShowProtocolButton(looksLikeUrlWithoutProtocol(value));
  }, [value]);

  const handleAddProtocol = () => {
    onChange(`https://${value}`);
  };

  return (
    <div className="space-y-1">
      <input
        type="text"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
      {/* Button always takes up space to prevent layout shift */}
      <button
        type="button"
        className={`btn btn-xs btn-ghost gap-1 transition-opacity ${showProtocolButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={handleAddProtocol}
        tabIndex={showProtocolButton ? 0 : -1}
      >
        <span className="text-xs">forgot https:// ?</span>
      </button>
    </div>
  );
}
