import { Building2, Briefcase, HandHelping, HelpCircle, Mail } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface UserProfileCardProps {
  user: Doc<"users">;
  onRequestMeeting?: () => void;
}

export function UserProfileCard({ user, onRequestMeeting }: UserProfileCardProps) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-4">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {(user.role || user.company) && (
              <p className="opacity-70">
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
            <div className="divider"></div>
            <p className="whitespace-pre-wrap">{user.bio}</p>
          </>
        )}

        {/* Details */}
        <div className="divider"></div>
        <div className="space-y-3">
          {user.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 opacity-70" />
              <a href={`mailto:${user.email}`} className="link link-hover">
                {user.email}
              </a>
            </div>
          )}

          {user.company && (
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 opacity-70" />
              <span>{user.company}</span>
            </div>
          )}

          {user.role && (
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 opacity-70" />
              <span>{user.role}</span>
            </div>
          )}

          {user.interests && user.interests.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="opacity-70 text-sm">Interests:</span>
              <div className="flex flex-wrap gap-1">
                {user.interests.map((interest, i) => (
                  <span key={i} className="badge badge-sm badge-outline">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.canHelpWith && (
            <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
              <HandHelping className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-success">Can help with:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{user.canHelpWith}</p>
              </div>
            </div>
          )}

          {user.needsHelpWith && (
            <div className="flex items-start gap-3 p-3 bg-info/10 rounded-lg">
              <HelpCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-info">Looking for help with:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{user.needsHelpWith}</p>
              </div>
            </div>
          )}
        </div>

        {/* Request Meeting Button */}
        {onRequestMeeting && (
          <div className="card-actions justify-end mt-6">
            <button onClick={onRequestMeeting} className="btn btn-primary">
              Request a Meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
