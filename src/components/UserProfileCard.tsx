import {
  Building2,
  Briefcase,
  HandHelping,
  HelpCircle,
  Mail,
} from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { InfoBox } from "@/components/patterns/InfoBox";

interface UserProfileCardProps {
  user: Doc<"users">;
  onRequestMeeting?: () => void;
}

export function UserProfileCard({
  user,
  onRequestMeeting,
}: UserProfileCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.imageUrl} alt={user.name} />
            <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {(user.role || user.company) && (
              <p className="text-muted-foreground">
                {user.role}
                {user.role && user.company && " at "}
                {user.company}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <>
            <Separator className="my-4" />
            <p className="whitespace-pre-wrap">{user.bio}</p>
          </>
        )}

        {/* Details */}
        <Separator className="my-4" />
        <div className="space-y-3">
          {user.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <a
                href={`mailto:${user.email}`}
                className="text-primary hover:underline underline-offset-4"
              >
                {user.email}
              </a>
            </div>
          )}

          {user.company && (
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <span>{user.company}</span>
            </div>
          )}

          {user.role && (
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
              <span>{user.role}</span>
            </div>
          )}

          {user.interests && user.interests.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground text-sm">Interests:</span>
              <div className="flex flex-wrap gap-1">
                {user.interests.map((interest, i) => (
                  <Badge key={i} variant="outline" size="sm">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {user.canHelpWith && (
            <InfoBox
              variant="success"
              icon={<HandHelping />}
              title="Can help with:"
            >
              <p className="whitespace-pre-wrap">{user.canHelpWith}</p>
            </InfoBox>
          )}

          {user.needsHelpWith && (
            <InfoBox
              variant="info"
              icon={<HelpCircle />}
              title="Looking for help with:"
            >
              <p className="whitespace-pre-wrap">{user.needsHelpWith}</p>
            </InfoBox>
          )}
        </div>

        {/* Request Meeting Button */}
        {onRequestMeeting && (
          <div className="flex justify-end mt-6">
            <Button onClick={onRequestMeeting}>Request a Meeting</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
