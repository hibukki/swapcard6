import { Link } from "@tanstack/react-router";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserNameProps {
  user: Doc<"users">;
  className?: string;
}

function UserPreviewCard({ user }: { user: Doc<"users"> }) {
  return (
    <div className="p-2 max-w-64 text-white">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback className="text-sm font-bold bg-white/20 text-white">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-semibold truncate">{user.name}</div>
          {(user.role || user.company) && (
            <div className="text-sm text-gray-300 truncate">
              {user.role}
              {user.role && user.company && " at "}
              {user.company}
            </div>
          )}
        </div>
      </div>
      {user.bio && (
        <p className="mt-2 text-sm text-gray-300 line-clamp-2">
          {user.bio}
        </p>
      )}
    </div>
  );
}

/**
 * A clickable user name that links to their profile.
 * Shows a preview card on hover.
 */
export function UserName({ user, className }: UserNameProps) {
  return (
    <Tippy
      content={<UserPreviewCard user={user} />}
      delay={[200, 0]}
      interactive
      appendTo={() => document.body}
    >
      <Link
        to="/user/$userId"
        params={{ userId: user._id }}
        className={cn(
          "font-semibold text-primary hover:underline underline-offset-4",
          className
        )}
      >
        {user.name}
      </Link>
    </Tippy>
  );
}
