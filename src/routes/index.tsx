import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Users, Calendar, MapPin, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/patterns/EmptyState";

const currentUserQuery = convexQuery(api.users.getCurrentUser, {});
const conferencesQuery = convexQuery(api.conferences.list, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    if ((window as any).Clerk?.session) {
      await Promise.all([
        queryClient.ensureQueryData(currentUserQuery),
        queryClient.ensureQueryData(conferencesQuery),
      ]);
    }
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
  const { data: conferences } = useSuspenseQuery(conferencesQuery);
  const navigate = useNavigate();

  const needsOnboarding = !user?.bio && !user?.role && !user?.canHelpWith;

  useEffect(() => {
    if (needsOnboarding) {
      void navigate({ to: "/profile" });
    }
  }, [needsOnboarding, navigate]);

  if (needsOnboarding) {
    return (
      <div>
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Redirecting to profile setup...</p>
      </div>
    );
  }

  if (!conferences || conferences.length === 0) {
    return (
      <div className="not-prose">
        <h1 className="text-2xl font-bold mb-6">Conferences</h1>
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No conferences available"
          description="Check back later for upcoming conferences."
        />
      </div>
    );
  }

  return (
    <div className="not-prose">
      <h1 className="text-2xl font-bold mb-6">Select a Conference</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
        {conferences.map((conference) => (
          <Link
            key={conference._id}
            to="/conference/$conferenceId/attendees"
            params={{ conferenceId: conference._id }}
            className="block"
          >
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {conference.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(conference.startDate).toLocaleDateString()} -{" "}
                      {new Date(conference.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  {conference.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{conference.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center text-primary text-sm font-medium">
                  Enter conference <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
