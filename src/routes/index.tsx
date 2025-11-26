import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session)
      await queryClient.ensureQueryData(currentUserQuery);
  },
  component: HomePage,
});

function HomePage() {
  return (
    <div className="text-center">
      <Unauthenticated>
        <div className="not-prose flex justify-center mb-6">
          <Users className="w-20 h-20 text-primary" />
        </div>
        <h1 className="mt-0">SwapCard6</h1>
        <p className="text-lg">Connect with conference attendees and schedule 1-on-1 meetings</p>
        <div className="not-prose mt-8">
          <SignInButton mode="modal">
            <button className="btn btn-primary btn-lg">Get Started</button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedHome />
      </Authenticated>
    </div>
  );
}

function AuthenticatedHome() {
  const { data: user } = useSuspenseQuery(currentUserQuery);
  const navigate = useNavigate();

  // Redirect to profile if user hasn't completed their profile
  const needsOnboarding = !user?.bio && !user?.role && !user?.canHelpWith;

  useEffect(() => {
    if (needsOnboarding) {
      void navigate({ to: "/profile" });
    } else {
      void navigate({ to: "/attendees" });
    }
  }, [needsOnboarding, navigate]);

  return (
    <div>
      <div className="loading loading-spinner loading-lg"></div>
      <p className="mt-4 opacity-70">Redirecting...</p>
    </div>
  );
}
