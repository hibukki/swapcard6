import { ClerkProvider, UserButton, useAuth } from "@clerk/clerk-react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">Arbiter Convex</h1>
              <nav className="flex space-x-4">
                <Link
                  to="/"
                  className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  activeProps={{
                    className: "font-bold bg-gray-200 dark:bg-gray-700",
                  }}
                >
                  Home
                </Link>
              </nav>
            </div>
            <UserButton />
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
          <footer className="p-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Arbiter Convex
          </footer>
        </div>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
