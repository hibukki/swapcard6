import { createContext, useContext } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

type Conference = Doc<"conferences">;

const ConferenceContext = createContext<Conference | null>(null);

export function ConferenceProvider({
  conference,
  children,
}: {
  conference: Conference;
  children: React.ReactNode;
}) {
  return (
    <ConferenceContext.Provider value={conference}>
      {children}
    </ConferenceContext.Provider>
  );
}

export function useConference(): Conference {
  const conference = useContext(ConferenceContext);
  if (!conference) {
    throw new Error("useConference must be used within a ConferenceProvider");
  }
  return conference;
}

export function useConferenceOptional(): Conference | null {
  return useContext(ConferenceContext);
}
