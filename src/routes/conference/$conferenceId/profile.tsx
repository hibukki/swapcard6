import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState, useMemo } from "react";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { CalendarSubscription } from "@/components/CalendarSubscription";
import { UserProfileCard } from "@/components/UserProfileCard";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InfoBox } from "@/components/patterns/InfoBox";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/conference/$conferenceId/profile")({
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

const CAN_HELP_SUGGESTIONS = [
  "Career advice in tech/non-profit",
  "Grant writing and fundraising",
  "Research methodology",
  "Community building",
  "Technical AI safety",
  "Operations and project management",
];

const NEEDS_HELP_SUGGESTIONS = [
  "Finding high-impact career paths",
  "Understanding cause prioritization",
  "Connecting with mentors",
  "Learning about AI alignment",
  "Transitioning to effective giving",
  "Starting a local EA group",
];

function ProfilePage() {
  const { conferenceId } = Route.useParams();
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

        void navigate({
          to: "/conference/$conferenceId/attendees",
          params: { conferenceId },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isNewUser && (
        <InfoBox variant="info" className="mb-6">
          Welcome! Let&apos;s set up your profile so other attendees can find
          you.
        </InfoBox>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Section */}
        <div className="flex-1">
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
                    <div className="space-y-2">
                      <Label htmlFor="company">Company / Organization</Label>
                      <Input
                        id="company"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., Open Philanthropy, DeepMind"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="role">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="role">Role / Title</Label>
                      <Input
                        id="role"
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
                  <div className="space-y-2">
                    <Label htmlFor="bio">About You</Label>
                    <Textarea
                      id="bio"
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
                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests</Label>
                    <Input
                      id="interests"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="AI Safety, Global Health, Career Planning (comma separated)"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separate with commas
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="canHelpWith">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="canHelpWith">How I can help others</Label>
                    <Textarea
                      id="canHelpWith"
                      rows={2}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What expertise or connections can you offer?"
                    />
                    {!field.state.value && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {CAN_HELP_SUGGESTIONS.map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => field.handleChange(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="needsHelpWith">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="needsHelpWith">
                      How others can help me
                    </Label>
                    <Textarea
                      id="needsHelpWith"
                      rows={2}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What are you hoping to learn or who do you want to meet?"
                    />
                    {!field.state.value && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {NEEDS_HELP_SUGGESTIONS.map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            className="cursor-pointer hover:bg-info hover:text-info-foreground"
                            onClick={() => field.handleChange(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={!form.state.canSubmit || isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : isNewUser
                      ? "Save & Find Connections"
                      : "Save"}
                </Button>
                {!isNewUser && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void navigate({
                        to: "/conference/$conferenceId/attendees",
                        params: { conferenceId },
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:w-96">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <p className="text-sm opacity-70 mb-4">
            This is how others will see you
          </p>
          <div className="not-prose sticky top-4">
            <UserProfileCard user={previewUser} />
          </div>
        </div>
      </div>

      <div className="not-prose mt-12 pt-8 border-t border-border">
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
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-lg font-semibold mb-2">Developer Tools</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Generate test data including sample users, conferences, meetings, and
        notifications. Your account will be included in the relationships.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleSeed()}
        disabled={isSeeding}
      >
        {isSeeding ? "Seeding..." : "Seed Test Data"}
      </Button>
      {result && (
        <p
          className={`text-sm mt-2 ${result.includes("success") ? "text-success" : "text-destructive"}`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
