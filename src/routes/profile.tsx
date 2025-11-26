import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Users } from "lucide-react";
import { useState, useMemo } from "react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { CalendarSubscription } from "../components/CalendarSubscription";
import { UserProfileCard } from "../components/UserProfileCard";
import type { Doc } from "../../convex/_generated/dataModel";

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

// Suggestions for the "can help with" field based on common EA conference topics
const CAN_HELP_SUGGESTIONS = [
  "Career advice in tech/non-profit",
  "Grant writing and fundraising",
  "Research methodology",
  "Community building",
  "Technical AI safety",
  "Operations and project management",
];

// Suggestions for the "needs help with" field
const NEEDS_HELP_SUGGESTIONS = [
  "Finding high-impact career paths",
  "Understanding cause prioritization",
  "Connecting with mentors",
  "Learning about AI alignment",
  "Transitioning to effective giving",
  "Starting a local EA group",
];

function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQuery);
  const updateProfile = useMutation(api.users.updateProfile);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNewUser = !user?.bio && !user?.role && !user?.canHelpWith;

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

  // Build a preview user object from form values
  const previewUser = useMemo((): Doc<"users"> => {
    const formValues = form.state.values;
    const interests = formValues.interests
      ?.split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    return {
      ...user!,
      bio: formValues.bio || undefined,
      company: formValues.company || undefined,
      role: formValues.role || undefined,
      interests: interests?.length ? interests : undefined,
      canHelpWith: formValues.canHelpWith || undefined,
      needsHelpWith: formValues.needsHelpWith || undefined,
    };
  }, [user, form.state.values]);

  // Compute search params for recommendations based on saved profile
  // (recommendations show users based on your saved profile, not in-progress edits)
  const searchParams = useMemo(() => {
    return {
      needsHelpWith: user?.needsHelpWith || undefined,
      canHelpWith: user?.canHelpWith || undefined,
      interests: user?.interests?.length ? user.interests : undefined,
      limit: 3,
    };
  }, [user?.needsHelpWith, user?.canHelpWith, user?.interests]);

  // Query for recommended users based on saved profile
  const hasSearchCriteria = !!(
    searchParams.needsHelpWith ||
    searchParams.canHelpWith ||
    (searchParams.interests && searchParams.interests.length > 0)
  );
  const { data: recommendedUsers } = useQuery({
    ...convexQuery(api.users.findRecommendedUsers, searchParams),
    enabled: hasSearchCriteria,
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isNewUser && (
        <div className="alert alert-info mb-6">
          <span>👋 Welcome! Let&apos;s set up your profile so other attendees can find you.</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Section */}
        <div className="flex-1">
          <h1 className="mt-0">{isNewUser ? "Complete Your Profile" : "Edit Your Profile"}</h1>
          <p className="mb-6">Help other attendees get to know you</p>

          <div className="not-prose">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="company">
                  {(field) => (
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium mb-1">
                        Company / Organization
                      </label>
                      <input
                        id="company"
                        type="text"
                        className="input input-border w-full"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., Open Philanthropy, DeepMind"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="role">
                  {(field) => (
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium mb-1">Role / Title</label>
                      <input
                        id="role"
                        type="text"
                        className="input input-border w-full"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., Research Analyst, Software Engineer"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="bio">
                {(field) => (
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium mb-1">About You</label>
                    <textarea
                      id="bio"
                      className="textarea textarea-border w-full"
                      rows={3}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="A brief intro - what brings you to this conference?"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="interests">
                {(field) => (
                  <div>
                    <label htmlFor="interests" className="block text-sm font-medium mb-1">
                      Interests
                    </label>
                    <input
                      id="interests"
                      type="text"
                      className="input input-border w-full"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="AI Safety, Global Health, Career Planning (comma separated)"
                    />
                    <p className="text-sm opacity-70 mt-1">
                      Separate with commas
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="canHelpWith">
                {(field) => (
                  <div>
                    <label htmlFor="canHelpWith" className="block text-sm font-medium mb-1">
                      How I can help others
                    </label>
                    <textarea
                      id="canHelpWith"
                      className="textarea textarea-border w-full"
                      rows={2}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What expertise or connections can you offer?"
                    />
                    {!field.state.value && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {CAN_HELP_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="badge badge-outline badge-sm cursor-pointer hover:badge-primary"
                            onClick={() => field.handleChange(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="needsHelpWith">
                {(field) => (
                  <div>
                    <label htmlFor="needsHelpWith" className="block text-sm font-medium mb-1">
                      How others can help me
                    </label>
                    <textarea
                      id="needsHelpWith"
                      className="textarea textarea-border w-full"
                      rows={2}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What are you hoping to learn or who do you want to meet?"
                    />
                    {!field.state.value && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {NEEDS_HELP_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="badge badge-outline badge-sm cursor-pointer hover:badge-info"
                            onClick={() => field.handleChange(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!form.state.canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Saving..." : isNewUser ? "Save & Find Connections" : "Save Profile"}
                </button>
                {!isNewUser && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void navigate({ to: "/attendees" });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:w-96">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <p className="text-sm opacity-70 mb-4">This is how others will see you</p>
          <div className="not-prose sticky top-4">
            <UserProfileCard user={previewUser} />
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      {hasSearchCriteria && (
        <div className="not-prose mt-8 pt-8 border-t border-base-300">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">People You Might Want to Meet</h2>
          </div>
          <p className="text-sm opacity-70 mb-4">
            Based on your interests and what you're looking for
          </p>

          {recommendedUsers && recommendedUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedUsers.map((recUser) => (
                <Link
                  key={recUser._id}
                  to="/user/$userId"
                  params={{ userId: recUser._id }}
                  className="card bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      {recUser.imageUrl ? (
                        <img
                          src={recUser.imageUrl}
                          alt={recUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                          {recUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{recUser.name}</h3>
                        {(recUser.role || recUser.company) && (
                          <p className="text-sm opacity-70 truncate">
                            {recUser.role}
                            {recUser.role && recUser.company && " at "}
                            {recUser.company}
                          </p>
                        )}
                      </div>
                    </div>
                    {recUser.canHelpWith && (
                      <p className="text-sm text-success mt-2 line-clamp-2">
                        Can help with: {recUser.canHelpWith}
                      </p>
                    )}
                    {recUser.needsHelpWith && (
                      <p className="text-sm text-info mt-1 line-clamp-2">
                        Looking for: {recUser.needsHelpWith}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-50">
              No matches yet. Keep filling out your profile!
            </p>
          )}
        </div>
      )}

      <div className="not-prose mt-12 pt-8 border-t border-base-300">
        <CalendarSubscription />
      </div>

      <SeedDataSection />
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
      await seedData({ baseTimestamp: Date.now() });
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
