import { createFileRoute, Outlet, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ConferenceProvider } from "@/contexts/ConferenceContext";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/conference/$conferenceId")({
  component: ConferenceLayout,
});

function ConferenceLayout() {
  const { conferenceId } = Route.useParams();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  const conference = useQuery(api.conferences.get, {
    conferenceId: conferenceId as Id<"conferences">,
  });
  const currentUser = useQuery(api.users.getCurrentUser);

  const needsOnboarding = currentUser && !currentUser.bio && !currentUser.role && !currentUser.canHelpWith;
  const isOnProfilePage = matchRoute({ to: "/conference/$conferenceId/profile", fuzzy: false });

  useEffect(() => {
    if (needsOnboarding && !isOnProfilePage) {
      void navigate({
        to: "/conference/$conferenceId/profile",
        params: { conferenceId },
        replace: true,
      });
    }
  }, [needsOnboarding, isOnProfilePage, navigate, conferenceId]);

  if (conference === undefined || currentUser === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (conference === null) {
    return (
      <div className="text-center py-8">
        <h1>Conference not found</h1>
        <p className="text-muted-foreground">
          The conference you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  if (needsOnboarding && !isOnProfilePage) {
    return (
      <div className="flex flex-col items-center py-8">
        <Spinner />
        <p className="mt-4 text-muted-foreground">Redirecting to profile setup...</p>
      </div>
    );
  }

  return (
    <ConferenceProvider conference={conference}>
      <Outlet />
    </ConferenceProvider>
  );
}
