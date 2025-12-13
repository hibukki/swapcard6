import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { MapPin, Plus, Trash2, Building } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConference } from "@/contexts/ConferenceContext";

export const Route = createFileRoute("/conference/$conferenceId/config")({
  component: ConfigPage,
});

function ConfigPage() {
  const conference = useConference();

  const meetingSpotsQuery = convexQuery(
    api.conferenceMeetingSpots.listByConference,
    { conferenceId: conference._id }
  );
  const { data: meetingSpots } = useSuspenseQuery(meetingSpotsQuery);

  const createSpot = useMutation(api.conferenceMeetingSpots.create);
  const removeSpot = useMutation(api.conferenceMeetingSpots.remove);

  const [newSpotName, setNewSpotName] = useState("");

  const handleAddSpot = async () => {
    if (!newSpotName.trim()) return;
    await createSpot({
      conferenceId: conference._id,
      name: newSpotName.trim(),
    });
    setNewSpotName("");
  };

  return (
    <div>
      <h1>Conference Configuration</h1>

      <div className="not-prose space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {conference.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4" />
              Meeting Spots
            </h3>

            {meetingSpots && meetingSpots.length > 0 && (
              <ul className="space-y-2 mb-4">
                {meetingSpots.map((spot) => (
                  <li
                    key={spot._id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span>{spot.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void removeSpot({ spotId: spot._id })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                value={newSpotName}
                onChange={(e) => setNewSpotName(e.target.value)}
                placeholder="New spot name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddSpot();
                }}
              />
              <Button
                size="sm"
                onClick={() => void handleAddSpot()}
                disabled={!newSpotName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
