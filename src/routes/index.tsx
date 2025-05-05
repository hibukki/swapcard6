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
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold text-center">
        Welcome to Arbiter Exchange!
      </h2>

      {currentUser && (
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-medium mb-4 text-center">Your Wallet</h3>
          <p className="text-center text-3xl font-bold mb-4">
            {currentUser.balance} <span className="text-sm">clips</span>
          </p>
          <div className="text-center">
            <Link
              to="/send"
              className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Send Clips
            </Link>
          </div>
        </div>
      )}

      <p className="text-center">
        New users automatically receive 1000 clips when they sign in for the
        first time.
      </p>
      <p className="text-center">
        Use the navigation links above to send clips to other users and view
        your transaction history.
      </p>
    </div>
  );
}
