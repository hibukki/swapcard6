import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationPickerProps {
  conferenceId?: Id<"conferences">;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationPicker({
  conferenceId,
  value,
  onChange,
  placeholder = "Enter location or select a spot",
}: LocationPickerProps) {
  const { data: spots } = useQuery({
    ...convexQuery(
      api.conferenceMeetingSpots.listByConference,
      conferenceId ? { conferenceId } : "skip"
    ),
    enabled: !!conferenceId,
  });

  const hasSpots = spots && spots.length > 0;

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hasSpots && (
        <div className="flex flex-wrap gap-1">
          {spots.map((spot) => (
            <Button
              key={spot._id}
              type="button"
              size="xs"
              variant={value === spot.name ? "default" : "outline"}
              onClick={() => onChange(spot.name)}
            >
              <MapPin className="w-3 h-3" />
              {spot.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
