import { SignInButton } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="text-center">
      <Unauthenticated>
        <div className="not-prose flex justify-center mb-6">
          <Users className="w-20 h-20 text-primary" />
        </div>
        <h1 className="mt-0">SwapCard6</h1>
        <p className="text-lg">Connect with conference attendees and schedule 1-on-1 meetings</p>
        <div className="not-prose mt-8">
          <SignInButton mode="modal">
            <button className="btn btn-primary btn-lg">Get Started</button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <Authenticated>
        <h1 className="mt-0">Welcome to SwapCard6</h1>
        <p>Browse attendees, send meeting requests, and manage your agenda</p>
      </Authenticated>
    </div>
  );
}
