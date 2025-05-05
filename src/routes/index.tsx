import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold text-center">Arbiter Convex</h1>
      <Content />
    </div>
  );
}

function Content() {
  const currentUser = useQuery(api.exchange.currentUser);

  return (
    <div className="max-w-lg mx-auto">
      <div className="card w-full">
        <div className="card-body">
          <h2 className="card-title justify-center">
            Welcome to Arbiter Exchange!
          </h2>

          {currentUser && (
            <div className="card bg-base-200 shadow-sm my-4">
              <div className="card-body">
                <h3 className="card-title justify-center">Your Wallet</h3>
                <p className="text-center text-3xl font-bold">
                  {currentUser.balance} <span className="text-sm">clips</span>
                </p>
                <div className="card-actions justify-center">
                  <Link to="/send" className="btn btn-primary">
                    Send Clips
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="divider"></div>

          <p className="text-center">
            New users automatically receive 1000 clips when they sign in for the
            first time.
          </p>
          <p className="text-center">
            Use the navigation links above to send clips to other users and view
            your transaction history.
          </p>
        </div>
      </div>
    </div>
  );
}
