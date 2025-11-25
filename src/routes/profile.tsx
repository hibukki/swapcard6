import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Calendar, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/profile")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session)
      await queryClient.ensureQueryData(currentUserQuery);
  },
  component: ProfilePage,
});

const profileSchema = z.object({
  bio: z.string().max(500),
  company: z.string().max(100),
  role: z.string().max(100),
  interests: z.string().max(500),
  canHelpWith: z.string().max(500),
  needsHelpWith: z.string().max(500),
});

function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQuery);
  const updateProfile = useMutation(api.users.updateProfile);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      bio: user?.bio ?? "",
      company: user?.company ?? "",
      role: user?.role ?? "",
      interests: user?.interests?.join(", ") ?? "",
      canHelpWith: user?.canHelpWith ?? "",
      needsHelpWith: user?.needsHelpWith ?? "",
    },
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        const interests = value.interests
          ?.split(",")
          .map((i) => i.trim())
          .filter(Boolean);

        await updateProfile({
          bio: value.bio || undefined,
          company: value.company || undefined,
          role: value.role || undefined,
          interests: interests?.length ? interests : undefined,
          canHelpWith: value.canHelpWith || undefined,
          needsHelpWith: value.needsHelpWith || undefined,
        });

        void navigate({ to: "/attendees" });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mt-0">Edit Your Profile</h1>
      <p>Help other attendees get to know you</p>

      <div className="not-prose mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={user.name}
              disabled
              className="input input-border w-full"
            />
            <p className="text-sm opacity-70 mt-1">
              Name is managed by your account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="input input-border w-full"
            />
            <p className="text-sm opacity-70 mt-1">
              Email is managed by your account
            </p>
          </div>

          <form.Field name="company">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Company
                </label>
                <input
                  type="text"
                  className="input input-border w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your company"
                />
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  className="input input-border w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your role or title"
                />
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  className="textarea textarea-border w-full"
                  rows={4}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Tell other attendees about yourself"
                />
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="interests">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Interests
                </label>
                <input
                  type="text"
                  className="input input-border w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="AI, Web Development, Design (comma separated)"
                />
                <p className="text-sm opacity-70 mt-1">
                  Separate multiple interests with commas
                </p>
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="canHelpWith">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  How I can help others
                </label>
                <textarea
                  className="textarea textarea-border w-full"
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Share your expertise, what you can offer to other attendees..."
                />
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="needsHelpWith">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  How others can help me
                </label>
                <textarea
                  className="textarea textarea-border w-full"
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="What are you looking to learn or get help with..."
                />
                {!field.state.meta.isValid && (
                  <p className="text-error text-sm mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.state.canSubmit || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                void navigate({ to: "/attendees" });
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <CalendarSubscriptionSection />

        <SeedDataSection />
      </div>
    </div>
  );
}

function CalendarSubscriptionSection() {
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
    <div className="mt-12 pt-8 border-t border-base-300">
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

function SeedDataSection() {
  const seedData = useMutation(api.seed.seedDataWithCurrentUser);
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);
    try {
      await seedData({});
      setResult("Test data created successfully!");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-base-300">
      <h2 className="text-lg font-semibold mb-2">Developer Tools</h2>
      <p className="text-sm opacity-70 mb-4">
        Generate test data including sample users, conferences, meetings, and notifications.
        Your account will be included in the relationships.
      </p>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => void handleSeed()}
        disabled={isSeeding}
      >
        {isSeeding ? "Seeding..." : "Seed Test Data"}
      </button>
      {result && (
        <p className={`text-sm mt-2 ${result.includes("success") ? "text-success" : "text-error"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
