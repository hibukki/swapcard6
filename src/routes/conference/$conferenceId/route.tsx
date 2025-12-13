import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ConferenceProvider } from "@/contexts/ConferenceContext";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/conference/$conferenceId")({
  component: ConferenceLayout,
});

function ConferenceLayout() {
  const { conferenceId } = Route.useParams();
  const conference = useQuery(api.conferences.get, {
    conferenceId: conferenceId as Id<"conferences">,
  });

  if (conference === undefined) {
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

  return (
    <ConferenceProvider conference={conference}>
      <Outlet />
    </ConferenceProvider>
  );
}
