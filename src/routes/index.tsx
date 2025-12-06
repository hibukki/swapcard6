import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
        <h1 className="mt-0">OpenCon</h1>
        <p className="text-lg">
          Connect with conference attendees and schedule 1-on-1 meetings
        </p>
        <div className="not-prose mt-8">
          <SignInButton mode="modal">
            <Button size="lg">Get Started</Button>
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
      <Spinner size="lg" />
      <p className="mt-4 text-muted-foreground">Redirecting...</p>
    </div>
  );
}
