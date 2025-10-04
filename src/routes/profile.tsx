import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
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
      </div>
    </div>
  );
}
